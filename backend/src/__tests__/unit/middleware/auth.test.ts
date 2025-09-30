import { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth, authenticateTokenFromQuery } from '../../../middleware/auth';
import { generateToken } from '../../../utils/jwt';
import pool from '../../../database/db';
import { AuthRequest } from '../../../types';

// Mock dependencies
jest.mock('../../../database/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../../utils/logger');

const mockPool = pool as { query: jest.Mock };

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token and set user on request', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
        status: 'active',
        status_text: null,
        timezone: 'UTC',
        is_active: true,
      };

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, username'),
        [userId]
      );
      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.userId).toBe(userId);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      mockReq.headers = {};

      await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is inactive', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate valid token when provided', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
      };

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.userId).toBe(userId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without auth when no token provided', async () => {
      mockReq.headers = {};

      await optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockReq.userId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should continue without auth when token is invalid', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      await optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without auth when user not found', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authenticateTokenFromQuery', () => {
    it('should authenticate token from query parameter', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
        status: 'active',
        status_text: null,
        timezone: 'UTC',
        is_active: true,
      };

      mockReq.query = {
        token,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await authenticateTokenFromQuery(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.userId).toBe(userId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate token from authorization header if query not present', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateToken(userId);
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
        status: 'active',
        status_text: null,
        timezone: 'UTC',
        is_active: true,
      };

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };
      mockReq.query = {};

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await authenticateTokenFromQuery(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      mockReq.headers = {};
      mockReq.query = {};

      await authenticateTokenFromQuery(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid token', async () => {
      mockReq.query = {
        token: 'invalid-token',
      };

      await authenticateTokenFromQuery(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});