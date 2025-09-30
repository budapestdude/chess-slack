import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken } from '../utils/jwt';

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
  try {
    const { email, username, password, displayName } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const result = await pool.query(
      `SELECT id, email, username, password_hash, display_name, avatar_url, status, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const session = await pool.query(
      `SELECT s.user_id, u.email, u.username, u.display_name, u.avatar_url, u.status, u.status_text
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [token]
    );

    if (session.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
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
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};