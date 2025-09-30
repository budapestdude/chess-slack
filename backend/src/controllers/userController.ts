import { Response } from 'express';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { io } from '../index';
import { NotFoundError } from '../errors';
import logger from '../utils/logger';

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const userResult = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.custom_status,
            u.status_emoji, u.bio, u.timezone, u.created_at,
            up.status as presence_status, up.last_activity
     FROM users u
     LEFT JOIN user_presence up ON u.id = up.user_id
     WHERE u.id = $1 AND u.is_active = true`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = userResult.rows[0];

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    customStatus: user.custom_status,
    statusEmoji: user.status_emoji,
    bio: user.bio,
    timezone: user.timezone,
    presenceStatus: user.presence_status || 'offline',
    lastActivity: user.last_activity,
    createdAt: user.created_at,
  });
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { displayName, bio, timezone, avatarUrl } = req.body;

  const result = await pool.query(
    `UPDATE users
     SET display_name = COALESCE($1, display_name),
         bio = COALESCE($2, bio),
         timezone = COALESCE($3, timezone),
         avatar_url = COALESCE($4, avatar_url),
         updated_at = NOW()
     WHERE id = $5
     RETURNING id, username, display_name, avatar_url, custom_status, status_emoji, bio, timezone`,
    [displayName, bio, timezone, avatarUrl, userId]
  );

  const user = result.rows[0];

  logger.info('User profile updated', { userId });

  // Broadcast profile update to all workspaces user is in
  const workspacesResult = await pool.query(
    'SELECT workspace_id FROM workspace_members WHERE user_id = $1',
    [userId]
  );

  workspacesResult.rows.forEach((row) => {
    io.in(`workspace:${row.workspace_id}`).emit('user-profile-updated', {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      customStatus: user.custom_status,
      statusEmoji: user.status_emoji,
      bio: user.bio,
      timezone: user.timezone,
    });
  });

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    customStatus: user.custom_status,
    statusEmoji: user.status_emoji,
    bio: user.bio,
    timezone: user.timezone,
  });
};

export const setCustomStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { customStatus, statusEmoji } = req.body;

  const result = await pool.query(
    `UPDATE users
     SET custom_status = $1,
         status_emoji = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, username, display_name, avatar_url, custom_status, status_emoji`,
    [customStatus || null, statusEmoji || null, userId]
  );

  const user = result.rows[0];

  // Broadcast status update to all workspaces
  const workspacesResult = await pool.query(
    'SELECT workspace_id FROM workspace_members WHERE user_id = $1',
    [userId]
  );

  workspacesResult.rows.forEach((row) => {
    io.in(`workspace:${row.workspace_id}`).emit('user-status-updated', {
      userId: user.id,
      customStatus: user.custom_status,
      statusEmoji: user.status_emoji,
    });
  });

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    customStatus: user.custom_status,
    statusEmoji: user.status_emoji,
  });
};

export const setPresence = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { status } = req.body;

  // Validate status
  const validStatuses = ['online', 'away', 'busy', 'offline'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Upsert presence
  await pool.query(
    `INSERT INTO user_presence (user_id, status, last_activity)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET status = $2, last_activity = NOW()`,
    [userId, status]
  );

  // Get user info for broadcast
  const userResult = await pool.query(
    'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
    [userId]
  );

  const user = userResult.rows[0];

  // Broadcast presence change to all workspaces
  const workspacesResult = await pool.query(
    'SELECT workspace_id FROM workspace_members WHERE user_id = $1',
    [userId]
  );

  workspacesResult.rows.forEach((row) => {
    io.in(`workspace:${row.workspace_id}`).emit('presence-changed', {
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      status,
    });
  });

  res.json({ status });
};

export const getWorkspaceMembers = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not a member of this workspace' });
  }

  const result = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.custom_status,
            u.status_emoji, wm.role,
            COALESCE(up.status, 'offline') as presence_status,
            up.last_activity
     FROM workspace_members wm
     JOIN users u ON wm.user_id = u.id
     LEFT JOIN user_presence up ON u.id = up.user_id
     WHERE wm.workspace_id = $1 AND u.is_active = true
     ORDER BY u.display_name`,
    [workspaceId]
  );

  const members = result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    customStatus: row.custom_status,
    statusEmoji: row.status_emoji,
    role: row.role,
    presenceStatus: row.presence_status,
    lastActivity: row.last_activity,
  }));

  res.json(members);
};