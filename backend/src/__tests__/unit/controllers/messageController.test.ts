import { Response } from 'express';
import { sendMessage, getMessages, editMessage, deleteMessage } from '../../../controllers/messageController';
import { AuthRequest } from '../../../types';
import pool from '../../../database/db';

jest.mock('../../../database/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../../utils/logger');
jest.mock('../../../index', () => ({
  io: {
    in: jest.fn().mockReturnValue({
      emit: jest.fn(),
      fetchSockets: jest.fn().mockResolvedValue([]),
    }),
  },
}));
jest.mock('../../../services/notificationService', () => ({
  extractMentionedUsers: jest.fn().mockReturnValue([]),
  notifyMentions: jest.fn().mockResolvedValue(undefined),
}));

const mockPool = pool as { query: jest.Mock };

describe('MessageController', () => {
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

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockMessage = {
        id: 'msg-123',
        workspace_id: 'ws-123',
        channel_id: 'ch-123',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test message',
        message_type: 'text',
        metadata: null,
        parent_message_id: null,
        is_edited: false,
        is_deleted: false,
        reply_count: 0,
        last_reply_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
      };

      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };
      mockReq.body = {
        content: 'Test message',
      };

      // Mock workspace membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock channel membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'member-123' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock message creation
      mockPool.query.mockResolvedValueOnce({
        rows: [mockMessage],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock user fetch
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await sendMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'msg-123',
          content: 'Test message',
          user: mockUser,
        })
      );
    });

    it('should reject message without workspace membership', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };
      mockReq.body = {
        content: 'Test message',
      };

      // Mock no workspace membership
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await sendMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/not a member/i),
        })
      );
    });

    it('should reject message without channel membership', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };
      mockReq.body = {
        content: 'Test message',
      };

      // Mock workspace membership exists
      mockPool.query.mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock no channel membership
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await sendMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/not a member of this channel/i),
        })
      );
    });

    it('should reject empty message', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };
      mockReq.body = {
        content: '',
      };

      await sendMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject message that is too long', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };
      mockReq.body = {
        content: 'a'.repeat(10001),
      };

      await sendMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          workspace_id: 'ws-123',
          channel_id: 'ch-123',
          user_id: 'user-1',
          content: 'Message 1',
          message_type: 'text',
          metadata: null,
          parent_message_id: null,
          is_edited: false,
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
          reply_count: '0',
          username: 'user1',
          display_name: 'User 1',
          avatar_url: null,
        },
      ];

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

      // Mock channel membership check
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'member-123' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock messages fetch
      mockPool.query.mockResolvedValueOnce({
        rows: mockMessages,
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await getMessages(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              id: 'msg-1',
              content: 'Message 1',
            }),
          ]),
        })
      );
    });

    it('should reject without workspace membership', async () => {
      mockReq.params = {
        workspaceId: 'ws-123',
        channelId: 'ch-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await getMessages(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('editMessage', () => {
    it('should edit message successfully', async () => {
      const mockMessage = {
        id: 'msg-123',
        channel_id: 'ch-123',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const mockUpdatedMessage = {
        id: 'msg-123',
        workspace_id: 'ws-123',
        channel_id: 'ch-123',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Updated message',
        message_type: 'text',
        metadata: null,
        parent_message_id: null,
        is_edited: true,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.params = {
        messageId: 'msg-123',
      };
      mockReq.body = {
        content: 'Updated message',
      };

      // Mock message ownership check
      mockPool.query.mockResolvedValueOnce({
        rows: [mockMessage],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock message update
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedMessage],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await editMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Updated message',
          is_edited: true,
        })
      );
    });

    it('should reject editing message not owned by user', async () => {
      const mockMessage = {
        id: 'msg-123',
        channel_id: 'ch-123',
        user_id: 'different-user-id',
      };

      mockReq.params = {
        messageId: 'msg-123',
      };
      mockReq.body = {
        content: 'Updated message',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockMessage],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await editMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/cannot edit/i),
        })
      );
    });

    it('should return 404 for non-existent message', async () => {
      mockReq.params = {
        messageId: 'non-existent',
      };
      mockReq.body = {
        content: 'Updated message',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await editMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message as owner', async () => {
      const mockMessage = {
        id: 'msg-123',
        channel_id: 'ch-123',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'member',
      };

      mockReq.params = {
        messageId: 'msg-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockMessage],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/deleted/i),
        })
      );
    });

    it('should delete message as admin', async () => {
      const mockMessage = {
        id: 'msg-123',
        channel_id: 'ch-123',
        user_id: 'different-user',
        role: 'admin',
      };

      mockReq.params = {
        messageId: 'msg-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockMessage],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/deleted/i),
        })
      );
    });

    it('should reject deletion without permission', async () => {
      const mockMessage = {
        id: 'msg-123',
        channel_id: 'ch-123',
        user_id: 'different-user',
        role: 'member',
      };

      mockReq.params = {
        messageId: 'msg-123',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockMessage],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await deleteMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 for non-existent message', async () => {
      mockReq.params = {
        messageId: 'non-existent',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await deleteMessage(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});