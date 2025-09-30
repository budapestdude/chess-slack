import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import pool from '../database/db';
import logger from '../utils/logger';

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);

    // Fetch user from database
    const result = await pool.query(
      'SELECT id, email, username, display_name, avatar_url, status, status_text, timezone, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const result = await pool.query(
        'SELECT id, email, username, display_name, avatar_url FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
        req.userId = decoded.userId;
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

export const authenticateTokenFromQuery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for token in query parameter first (for file downloads)
    const token = (req.query.token as string) || (req.headers['authorization']?.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);

    // Fetch user from database
    const result = await pool.query(
      'SELECT id, email, username, display_name, avatar_url, status, status_text, timezone, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      logger.warn('User not found during token authentication', { userId: decoded.userId });
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};