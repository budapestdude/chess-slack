import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../../../middleware/sanitize';

describe('Sanitize Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('XSS sanitization', () => {
    it('should sanitize XSS in request body', () => {
      mockReq.body = {
        content: '<script>alert("XSS")</script>Hello World',
        username: '<img src=x onerror=alert(1)>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.content).not.toContain('<script>');
      expect(mockReq.body.username).not.toContain('<img');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow safe HTML tags in body', () => {
      mockReq.body = {
        content: 'This is <b>bold</b> and <i>italic</i> text',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.content).toContain('<b>');
      expect(mockReq.body.content).toContain('<i>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize XSS in query parameters', () => {
      mockReq.query = {
        search: '<script>alert("XSS")</script>search term',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.search).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize XSS in params', () => {
      mockReq.params = {
        id: '<script>alert(1)</script>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.params.id).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      mockReq.body = {
        user: {
          name: '<script>alert(1)</script>John',
          profile: {
            bio: '<img src=x onerror=alert(1)>Bio text',
          },
        },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.user.name).not.toContain('<script>');
      expect(mockReq.body.user.profile.bio).not.toContain('<img');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      mockReq.body = {
        items: [
          '<script>alert(1)</script>Item 1',
          '<img src=x onerror=alert(1)>Item 2',
          'Safe item 3',
        ],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.items[0]).not.toContain('<script>');
      expect(mockReq.body.items[1]).not.toContain('<img');
      expect(mockReq.body.items[2]).toBe('Safe item 3');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not sanitize tokens and sensitive fields', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      mockReq.body = {
        token,
        authorization: 'Bearer ' + token,
        jwt: token,
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.token).toBe(token);
      expect(mockReq.body.authorization).toBe('Bearer ' + token);
      expect(mockReq.body.jwt).toBe(token);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-string values', () => {
      mockReq.body = {
        count: 42,
        isActive: true,
        data: null,
        metadata: undefined,
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.count).toBe(42);
      expect(mockReq.body.isActive).toBe(true);
      expect(mockReq.body.data).toBeNull();
      expect(mockReq.body.metadata).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty request data', () => {
      mockReq.body = undefined;
      mockReq.query = undefined;
      mockReq.params = undefined;

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should strip dangerous tags completely', () => {
      mockReq.body = {
        content: '<style>body{display:none}</style>Text<script>alert(1)</script>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.content).not.toContain('<style>');
      expect(mockReq.body.content).not.toContain('<script>');
      expect(mockReq.body.content).toContain('Text');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle event handlers in HTML', () => {
      mockReq.body = {
        content: '<div onclick="alert(1)">Click me</div>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.content).not.toContain('onclick');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});