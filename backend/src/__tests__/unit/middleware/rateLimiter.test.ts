import { authLimiter, messageLimiter, apiLimiter, uploadLimiter, searchLimiter } from '../../../middleware/rateLimiter';

describe('Rate Limiter Middleware', () => {
  describe('authLimiter', () => {
    it('should be defined', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });
  });

  describe('messageLimiter', () => {
    it('should be defined', () => {
      expect(messageLimiter).toBeDefined();
      expect(typeof messageLimiter).toBe('function');
    });
  });

  describe('apiLimiter', () => {
    it('should be defined', () => {
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });
  });

  describe('uploadLimiter', () => {
    it('should be defined', () => {
      expect(uploadLimiter).toBeDefined();
      expect(typeof uploadLimiter).toBe('function');
    });
  });

  describe('searchLimiter', () => {
    it('should be defined', () => {
      expect(searchLimiter).toBeDefined();
      expect(typeof searchLimiter).toBe('function');
    });
  });

  describe('All rate limiters', () => {
    it('should all be middleware functions', () => {
      const limiters = [authLimiter, messageLimiter, apiLimiter, uploadLimiter, searchLimiter];
      limiters.forEach((limiter) => {
        expect(typeof limiter).toBe('function');
        expect(limiter).toBeDefined();
      });
    });
  });
});