import { generateToken, generateRefreshToken, verifyToken } from '../../utils/jwt';

describe('JWT Utils', () => {
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const token = generateToken(testUserId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different users', () => {
      const userId1 = '123e4567-e89b-12d3-a456-426614174001';
      const userId2 = '123e4567-e89b-12d3-a456-426614174002';

      const token1 = generateToken(userId1);
      const token2 = generateToken(userId2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const refreshToken = generateRefreshToken(testUserId);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(0);
    });

    it('should be verifiable and contain correct userId', () => {
      const refreshToken = generateRefreshToken(testUserId);
      const decoded = verifyToken(refreshToken);

      expect(decoded.userId).toBe(testUserId);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testUserId);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUserId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        verifyToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => {
        verifyToken('');
      }).toThrow();
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => {
        verifyToken(malformedToken);
      }).toThrow();
    });
  });
});