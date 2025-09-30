import { Response } from 'express';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
} from '../../../controllers/workspaceController';
import { AuthRequest } from '../../../types';
import pool from '../../../database/db';

jest.mock('../../../database/db', () => ({
  query: jest.fn(),
}));

const mockPool = pool as { query: jest.Mock };

describe('WorkspaceController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {},
      userId: '123e4567-e89b-12d3-a456-426614174000',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create workspace successfully', async () => {
      const mockWorkspace = {
        id: 'ws-123',
        name: 'Test Workspace',
        slug: 'test-workspace',
        description: 'Test description',
        logo_url: null,
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.body = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        description: 'Test description',
      };

      // Mock slug doesn't exist
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      // Mock workspace creation
      mockPool.query.mockResolvedValueOnce({
        rows: [mockWorkspace],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock add owner member
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock create general channel
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'ch-123' }],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock add to general channel
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await createWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Workspace',
          slug: 'test-workspace',
        })
      );
    });

    it('should reject duplicate workspace slug', async () => {
      mockReq.body = {
        name: 'Test Workspace',
        slug: 'existing-slug',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-ws' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await createWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/already exists/i),
        })
      );
    });

    it('should reject invalid workspace slug format', async () => {
      mockReq.body = {
        name: 'Test Workspace',
        slug: 'Invalid Slug!',
      };

      await createWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject short workspace name', async () => {
      mockReq.body = {
        name: '',
        slug: 'test-workspace',
      };

      await createWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getWorkspaces', () => {
    it('should retrieve user workspaces', async () => {
      const mockWorkspaces = [
        {
          id: 'ws-1',
          name: 'Workspace 1',
          slug: 'workspace-1',
          description: 'First workspace',
          logo_url: null,
          owner_id: 'owner-1',
          role: 'member',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'ws-2',
          name: 'Workspace 2',
          slug: 'workspace-2',
          description: 'Second workspace',
          logo_url: null,
          owner_id: '123e4567-e89b-12d3-a456-426614174000',
          role: 'owner',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockWorkspaces,
        command: 'SELECT',
        oid: 0,
        rowCount: 2,
        fields: [],
      });

      await getWorkspaces(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaces: expect.arrayContaining([
            expect.objectContaining({
              name: 'Workspace 1',
            }),
            expect.objectContaining({
              name: 'Workspace 2',
              role: 'owner',
            }),
          ]),
        })
      );
    });

    it('should return empty array if no workspaces', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await getWorkspaces(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaces: [],
        })
      );
    });
  });

  describe('getWorkspace', () => {
    it('should get workspace details for member', async () => {
      const mockWorkspace = {
        id: 'ws-123',
        name: 'Test Workspace',
        slug: 'test-workspace',
        description: 'Test description',
        logo_url: null,
        owner_id: 'owner-id',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.params = { workspaceId: 'ws-123' };

      // Mock membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock workspace fetch
      mockPool.query.mockResolvedValueOnce({
        rows: [mockWorkspace],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await getWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Workspace',
          role: 'member',
        })
      );
    });

    it('should reject non-members', async () => {
      mockReq.params = { workspaceId: 'ws-123' };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await getWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 for non-existent workspace', async () => {
      mockReq.params = { workspaceId: 'non-existent' };

      // Mock membership check passes
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock workspace not found
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await getWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace as owner', async () => {
      const mockUpdatedWorkspace = {
        id: 'ws-123',
        name: 'Updated Name',
        slug: 'test-workspace',
        description: 'Updated description',
        logo_url: null,
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      // Mock owner check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'owner' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock workspace update
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedWorkspace],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await updateWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          description: 'Updated description',
        })
      );
    });

    it('should update workspace as admin', async () => {
      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {
        name: 'Updated Name',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'ws-123', name: 'Updated Name' }],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await updateWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should reject update without permission', async () => {
      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {
        name: 'Updated Name',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await updateWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject update with no fields', async () => {
      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {};

      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'owner' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await updateWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace as owner', async () => {
      mockReq.params = { workspaceId: 'ws-123' };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ owner_id: '123e4567-e89b-12d3-a456-426614174000' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/deleted/i),
        })
      );
    });

    it('should reject deletion by non-owner', async () => {
      mockReq.params = { workspaceId: 'ws-123' };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ owner_id: 'different-user' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/owner/i),
        })
      );
    });

    it('should return 404 for non-existent workspace', async () => {
      mockReq.params = { workspaceId: 'non-existent' };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await deleteWorkspace(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getWorkspaceMembers', () => {
    it('should retrieve workspace members', async () => {
      const mockMembers = [
        {
          id: 'user-1',
          username: 'user1',
          display_name: 'User One',
          avatar_url: null,
          status: 'active',
        },
        {
          id: 'user-2',
          username: 'user2',
          display_name: 'User Two',
          avatar_url: null,
          status: 'active',
        },
      ];

      mockReq.params = { workspaceId: 'ws-123' };

      // Mock membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'member-id' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock members fetch
      mockPool.query.mockResolvedValueOnce({
        rows: mockMembers,
        command: 'SELECT',
        oid: 0,
        rowCount: 2,
        fields: [],
      });

      await getWorkspaceMembers(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          members: expect.arrayContaining([
            expect.objectContaining({
              username: 'user1',
            }),
          ]),
        })
      );
    });

    it('should filter members by search query', async () => {
      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.query = { search: 'john' };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'member-id' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ username: 'john', display_name: 'John Doe' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await getWorkspaceMembers(mockReq as AuthRequest, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['ws-123', '%john%'])
      );
    });

    it('should reject non-members', async () => {
      mockReq.params = { workspaceId: 'ws-123' };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await getWorkspaceMembers(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});