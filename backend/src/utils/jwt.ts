import jwt from 'jsonwebtoken';
import logger from './logger';

// CRITICAL: JWT_SECRET must be set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  logger.error('CRITICAL SECURITY ERROR: JWT_SECRET is not set in production environment');
  throw new Error('JWT_SECRET environment variable must be set in production');
}

// Use a secure default only in development/test environments
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    throw new Error('JWT_SECRET must be set');
  }
  logger.warn('Using default JWT_SECRET - this should only happen in development/test');
  return 'development-only-secret-change-in-production';
})();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validate JWT_SECRET strength
if (JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET is shorter than recommended 32 characters');
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
};

export const verifyToken = (token: string): { userId: string } => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' } as any);
};