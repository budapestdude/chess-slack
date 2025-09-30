import { Request, Response } from 'express';
import { register, login, logout, getCurrentUser } from '../../../controllers/authController';
import pool from '../../../database/db';
import { hashPassword } from '../../../utils/password';
import * as jwt from '../../../utils/jwt';

jest.mock('../../../database/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../../utils/password');
jest.mock('../../../utils/jwt');

const mockPool = pool as { query: jest.Mock };
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('AuthController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
        status: 'active',
        created_at: new Date(),
      };

      mockReq.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        displayName: 'Test User',
      };

      // Mock user doesn't exist
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      mockHashPassword.mockResolvedValueOnce('hashed-password');

      // Mock user creation
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock session creation
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      (jwt.generateToken as jest.Mock).mockReturnValue('mock-token');
      (jwt.generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            email: 'test@example.com',
            username: 'testuser',
          }),
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        })
      );
    });

    it('should reject registration with duplicate email', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'Password123!',
      };

      // Mock user exists
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-id' }],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/already exists/i),
        })
      );
    });

    it('should reject registration with invalid email', async () => {
      mockReq.body = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123!',
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid input',
        })
      );
    });

    it('should reject registration with short username', async () => {
      mockReq.body = {
        email: 'test@example.com',
        username: 'ab',
        password: 'Password123!',
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject registration with short password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
      };

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors', async () => {
      mockReq.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed-password',
        display_name: 'Test User',
        avatar_url: null,
        status: 'active',
        is_active: true,
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      // Mock user found
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      // Mock session creation
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const mockComparePassword = require('../../../utils/password').comparePassword;
      mockComparePassword.mockResolvedValueOnce(true);

      (jwt.generateToken as jest.Mock).mockReturnValue('mock-token');
      (jwt.generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');

      await login(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            email: 'test@example.com',
          }),
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        })
      );
    });

    it('should reject login with invalid email', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/invalid/i),
        })
      );
    });

    it('should reject login with wrong password', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: true,
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword!',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const mockComparePassword = require('../../../utils/password').comparePassword;
      mockComparePassword.mockResolvedValueOnce(false);

      await login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject login for disabled account', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: false,
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/disabled/i),
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully with token', async () => {
      mockReq.headers = {
        authorization: 'Bearer mock-token',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await logout(mockReq as Request, mockRes as Response);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE token = $1',
        ['mock-token']
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/logged out/i),
        })
      );
    });

    it('should handle logout without token', async () => {
      mockReq.headers = {};

      await logout(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/logged out/i),
        })
      );
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should handle database errors during logout', async () => {
      mockReq.headers = {
        authorization: 'Bearer mock-token',
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await logout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user with valid token', async () => {
      const mockUser = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: null,
        status: 'active',
        status_text: null,
      };

      mockReq.headers = {
        authorization: 'Bearer mock-token',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          username: 'testuser',
        })
      );
    });

    it('should return 401 when no token provided', async () => {
      mockReq.headers = {};

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No token provided',
        })
      );
    });

    it('should return 401 for invalid or expired session', async () => {
      mockReq.headers = {
        authorization: 'Bearer mock-token',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await getCurrentUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/invalid|expired/i),
        })
      );
    });
  });
});