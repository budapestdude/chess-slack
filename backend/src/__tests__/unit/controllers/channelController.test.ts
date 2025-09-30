import { Response } from 'express';
import {
  createChannel,
  getChannels,
  getChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
} from '../../../controllers/channelController';
import { AuthRequest } from '../../../types';
import pool from '../../../database/db';

jest.mock('../../../database/db', () => ({
  query: jest.fn(),
}));

const mockPool = pool as { query: jest.Mock };

describe('ChannelController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      userId: '123e4567-e89b-12d3-a456-426614174000',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('createChannel', () => {
    it('should create a channel successfully', async () => {
      const mockChannel = {
        id: 'ch-123',
        workspace_id: 'ws-123',
        name: 'test-channel',
        description: 'Test channel',
        topic: null,
        is_private: false,
        is_archived: false,
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {
        name: 'test-channel',
        description: 'Test channel',
        isPrivate: false,
      };

      // Mock workspace membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock channel name doesn't exist
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      // Mock channel creation
      mockPool.query.mockResolvedValueOnce({
        rows: [mockChannel],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock add creator as admin
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await createChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-channel',
          isPrivate: false,
        })
      );
    });

    it('should reject channel creation without workspace membership', async () => {
      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {
        name: 'test-channel',
        isPrivate: false,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await createChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject duplicate channel name', async () => {
      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {
        name: 'existing-channel',
        isPrivate: false,
      };

      // Mock workspace membership exists
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock channel name exists
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-ch' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await createChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/already exists/i),
        })
      );
    });

    it('should reject invalid channel name', async () => {
      mockReq.params = { workspaceId: 'ws-123' };
      mockReq.body = {
        name: 'Invalid Channel Name!',
        isPrivate: false,
      };

      await createChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getChannels', () => {
    it('should retrieve channels for workspace member', async () => {
      const mockChannels = [
        {
          id: 'ch-1',
          workspace_id: 'ws-123',
          name: 'general',
          description: 'General channel',
          topic: null,
          is_private: false,
          is_archived: false,
          created_by: 'user-1',
          created_at: new Date(),
          updated_at: new Date(),
          user_role: 'member',
          is_member: true,
        },
      ];

      mockReq.params = { workspaceId: 'ws-123' };

      // Mock workspace membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock channels fetch
      mockPool.query.mockResolvedValueOnce({
        rows: mockChannels,
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await getChannels(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: expect.arrayContaining([
            expect.objectContaining({
              name: 'general',
            }),
          ]),
        })
      );
    });

    it('should reject non-workspace members', async () => {
      mockReq.params = { workspaceId: 'ws-123' };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await getChannels(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('joinChannel', () => {
    it('should join public channel successfully', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };

      // Mock workspace membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock channel is public
      mockPool.query.mockResolvedValueOnce({
        rows: [{ is_private: false }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock not already a member
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      // Mock join channel
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await joinChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/joined/i),
        })
      );
    });

    it('should reject joining private channel', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };

      // Mock workspace membership
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock channel is private
      mockPool.query.mockResolvedValueOnce({
        rows: [{ is_private: true }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await joinChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/private/i),
        })
      );
    });

    it('should reject if already a member', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };

      // Mock workspace membership
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock channel is public
      mockPool.query.mockResolvedValueOnce({
        rows: [{ is_private: false }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock already a member
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'member-id' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await joinChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/already a member/i),
        })
      );
    });
  });

  describe('leaveChannel', () => {
    it('should leave channel successfully', async () => {
      mockReq.params = {
        channelId: 'ch-123',
      };

      // Mock channel is not general
      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'other-channel' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock leave channel
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await leaveChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/left/i),
        })
      );
    });

    it('should reject leaving general channel', async () => {
      mockReq.params = {
        channelId: 'ch-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'general' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await leaveChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/general/i),
        })
      );
    });
  });

  describe('deleteChannel', () => {
    it('should delete channel as admin', async () => {
      mockReq.params = {
        channelId: 'ch-123',
      };

      // Mock channel is not general
      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'deletable-channel' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock user is admin
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock delete channel
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/deleted/i),
        })
      );
    });

    it('should reject deleting general channel', async () => {
      mockReq.params = {
        channelId: 'ch-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'general' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject deletion without admin permission', async () => {
      mockReq.params = {
        channelId: 'ch-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'some-channel' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteChannel(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});