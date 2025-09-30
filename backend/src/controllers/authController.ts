import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { BadRequestError, UnauthorizedError, InternalError } from '../errors';
import logger from '../utils/logger';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  const { email, username, password, displayName } = registerSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existingUser.rows.length > 0) {
    logger.warn('Registration attempt with existing email or username', {
      email,
      username,
      ip: req.ip
    });
    throw new BadRequestError('Email or username already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, username, password_hash, display_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, username, display_name, avatar_url, status, created_at`,
    [email, username, passwordHash, displayName || username]
  );

  const user = result.rows[0];

  // Generate tokens
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store session
  await pool.query(
    `INSERT INTO sessions (user_id, token, refresh_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5)`,
    [user.id, token, refreshToken, req.ip, req.headers['user-agent']]
  );

  logger.info('New user registered', {
    userId: user.id,
    username: user.username,
    email: user.email,
    ip: req.ip
  });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      status: user.status,
    },
    token,
    refreshToken,
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  // Find user
  const result = await pool.query(
    `SELECT id, email, username, password_hash, display_name, avatar_url, status, is_active
     FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    logger.warn('Failed login attempt - user not found', { email, ip: req.ip });
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    logger.warn('Login attempt on disabled account', {
      userId: user.id,
      email,
      ip: req.ip
    });
    throw new UnauthorizedError('Account is disabled');
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    logger.warn('Failed login attempt - invalid password', {
      userId: user.id,
      email,
      ip: req.ip
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store session
  await pool.query(
    `INSERT INTO sessions (user_id, token, refresh_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5)`,
    [user.id, token, refreshToken, req.ip, req.headers['user-agent']]
  );

  logger.info('Successful login', {
    userId: user.id,
    username: user.username,
    ip: req.ip
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      status: user.status,
    },
    token,
    refreshToken,
  });
};

export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);

    const userId = (req as any).userId; // May be set by optional auth middleware
    logger.info('User logged out', { userId, ip: req.ip });
  }

  res.json({ message: 'Logged out successfully' });
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  const session = await pool.query(
    `SELECT s.user_id, u.email, u.username, u.display_name, u.avatar_url, u.status, u.status_text
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`,
    [token]
  );

  if (session.rows.length === 0) {
    throw new UnauthorizedError('Invalid or expired session');
  }

  const user = session.rows[0];

  res.json({
    id: user.user_id,
    email: user.email,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    status: user.status,
    statusText: user.status_text,
  });
};