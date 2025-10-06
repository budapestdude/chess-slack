import { Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { io } from '../index';
import { NotFoundError, BadRequestError } from '../errors';
import logger from '../utils/logger';
import { validateFileType } from '../middleware/upload';
import { uploadFile, getFile } from '../utils/storage';

// Helper to transform relative avatar URLs to full URLs for cross-origin compatibility
const getFullAvatarUrl = (avatarUrl: string | null): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl; // Already a full URL
  }
  const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || '';
  return baseUrl ? `${baseUrl}${avatarUrl}` : avatarUrl;
};

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
    avatarUrl: getFullAvatarUrl(user.avatar_url),
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
      avatarUrl: getFullAvatarUrl(user.avatar_url),
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
    avatarUrl: getFullAvatarUrl(user.avatar_url),
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
    avatarUrl: getFullAvatarUrl(user.avatar_url),
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
      avatarUrl: getFullAvatarUrl(user.avatar_url),
      status,
    });
  });

  res.json({ status });
};

export const setDndSettings = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { dndStart, dndEnd, timezone } = req.body;

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (dndStart && !timeRegex.test(dndStart)) {
    return res.status(400).json({ error: 'Invalid dndStart format. Use HH:MM' });
  }
  if (dndEnd && !timeRegex.test(dndEnd)) {
    return res.status(400).json({ error: 'Invalid dndEnd format. Use HH:MM' });
  }

  const result = await pool.query(
    `UPDATE users
     SET dnd_start = $1,
         dnd_end = $2,
         timezone = COALESCE($3, timezone),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, dnd_start, dnd_end, timezone`,
    [dndStart || null, dndEnd || null, timezone, userId]
  );

  const user = result.rows[0];

  logger.info('DND settings updated', { userId, dndStart, dndEnd });

  res.json({
    dndStart: user.dnd_start,
    dndEnd: user.dnd_end,
    timezone: user.timezone,
  });
};

export const getDndSettings = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const result = await pool.query(
    'SELECT dnd_start, dnd_end, timezone FROM users WHERE id = $1',
    [userId]
  );

  const user = result.rows[0];

  res.json({
    dndStart: user.dnd_start,
    dndEnd: user.dnd_end,
    timezone: user.timezone,
  });
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
    avatarUrl: getFullAvatarUrl(row.avatar_url),
    customStatus: row.custom_status,
    statusEmoji: row.status_emoji,
    role: row.role,
    presenceStatus: row.presence_status,
    lastActivity: row.last_activity,
  }));

  res.json(members);
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No file uploaded');
  }

  // Validate file is an image
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    // Clean up uploaded file
    await fs.unlink(file.path).catch(() => {});
    throw new BadRequestError('Only image files (JPEG, PNG, GIF, WEBP) are allowed');
  }

  // Validate file type using magic numbers
  const isValidFileType = await validateFileType(file.path, file.mimetype);
  if (!isValidFileType) {
    await fs.unlink(file.path).catch(() => {});
    logger.warn('Avatar upload rejected - magic number validation failed', {
      userId,
      filename: file.originalname,
      declaredMimeType: file.mimetype
    });
    throw new BadRequestError(`File type validation failed for ${file.originalname}. The file content does not match the declared type.`);
  }

  // Limit file size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    await fs.unlink(file.path).catch(() => {});
    throw new BadRequestError('Avatar file size must be less than 5MB');
  }

  // Read file buffer
  const fileBuffer = await fs.readFile(file.path);

  // Upload to storage (S3 or local)
  const ext = path.extname(file.originalname);
  const storageKey = `avatars/${userId}/avatar-${Date.now()}${ext}`;

  let avatarUrl: string;
  try {
    avatarUrl = await uploadFile({
      buffer: fileBuffer,
      key: storageKey,
      contentType: file.mimetype,
    });
    logger.info('Avatar uploaded to storage', { userId, storageKey, avatarUrl });
  } catch (error: any) {
    logger.error('Failed to upload avatar to storage', { userId, error: error.message });
    await fs.unlink(file.path).catch(() => {});
    throw new BadRequestError('Failed to save avatar file');
  }

  // Clean up temporary file
  await fs.unlink(file.path).catch((error) => {
    logger.debug('Temp file cleanup - file may already be deleted', { path: file.path });
  });

  const result = await pool.query(
    `UPDATE users
     SET avatar_url = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, username, display_name, avatar_url, custom_status, status_emoji`,
    [avatarUrl, userId]
  );

  const user = result.rows[0];

  logger.info('Avatar uploaded successfully', { userId, filename, newPath });

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
      avatarUrl: getFullAvatarUrl(user.avatar_url),
      customStatus: user.custom_status,
      statusEmoji: user.status_emoji,
    });
  });

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: getFullAvatarUrl(user.avatar_url),
    customStatus: user.custom_status,
    statusEmoji: user.status_emoji,
  });
};

export const getAvatar = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Get user's avatar URL from database
  const result = await pool.query(
    'SELECT avatar_url FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const avatarUrl = result.rows[0].avatar_url;
  if (!avatarUrl) {
    throw new NotFoundError('Avatar not found');
  }

  // If S3 URL, redirect to it
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return res.redirect(avatarUrl);
  }

  // Otherwise, serve from local storage
  // Extract storage key from URL path
  const storageKey = avatarUrl.replace(/^\/uploads\//, '');

  try {
    const fileBuffer = await getFile(storageKey);

    if (!fileBuffer) {
      throw new NotFoundError('Avatar file not found');
    }

    // Determine content type from file extension
    const ext = path.extname(storageKey).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('Error fetching avatar', { userId, error: error.message });
    throw new NotFoundError('Avatar file not found');
  }
};

export const getUserAvatar = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  // Get user's avatar URL from database
  const result = await pool.query(
    'SELECT avatar_url FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const avatarUrl = result.rows[0].avatar_url;
  if (!avatarUrl) {
    throw new NotFoundError('Avatar not found');
  }

  // If S3 URL, redirect to it
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return res.redirect(avatarUrl);
  }

  // Otherwise, serve from local storage
  // Extract storage key from URL path
  const storageKey = avatarUrl.replace(/^\/uploads\//, '');

  try {
    const fileBuffer = await getFile(storageKey);

    if (!fileBuffer) {
      throw new NotFoundError('Avatar file not found');
    }

    // Determine content type from file extension
    const ext = path.extname(storageKey).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('Error fetching avatar', { userId, error: error.message });
    throw new NotFoundError('Avatar file not found');
  }
};