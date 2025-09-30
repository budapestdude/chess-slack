import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorHandler } from '../../../middleware/errorHandler';
import { AppError, BadRequestError, UnauthorizedError, ValidationError } from '../../../errors';
import logger from '../../../utils/logger';

// Mock logger
jest.mock('../../../utils/logger');

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('AppError handling', () => {
    it('should handle BadRequestError with correct status code', () => {
      const error = new BadRequestError('Invalid data');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid data',
        })
      );
    });

    it('should handle UnauthorizedError with correct status code', () => {
      const error = new UnauthorizedError('Not authorized');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not authorized',
        })
      );
    });

    it('should include details for ValidationError', () => {
      const details = { field: 'email', message: 'Invalid email' };
      const error = new ValidationError('Validation failed', details);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details,
        })
      );
    });
  });

  describe('Zod error handling', () => {
    it('should handle Zod validation errors', () => {
      const schema = z.object({ email: z.string().email() });

      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        errorHandler(error as Error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Invalid input',
            details: expect.any(Array),
          })
        );
      }
    });
  });

  describe('Database error handling', () => {
    it('should handle PostgreSQL unique violation (23505)', () => {
      const error: any = new Error('Duplicate key');
      error.code = '23505';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Resource already exists',
      });
    });

    it('should handle PostgreSQL foreign key violation (23503)', () => {
      const error: any = new Error('Foreign key constraint');
      error.code = '23503';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid reference to related resource',
      });
    });

    it('should handle PostgreSQL not null violation (23502)', () => {
      const error: any = new Error('Not null violation');
      error.code = '23502';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Required field is missing',
      });
    });
  });

  describe('Unknown error handling', () => {
    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should not expose error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal error with sensitive info');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Development error',
          stack: expect.any(String),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error logging', () => {
    it('should log all errors', () => {
      const error = new BadRequestError('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should log programming errors separately', () => {
      const error = new Error('Programming error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledTimes(2); // Once for general, once for programming error
    });
  });
});