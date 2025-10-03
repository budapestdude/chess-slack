import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import logger from '../utils/logger';

const createChannelSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-_]+$/),
  description: z.string().optional(),
  topic: z.string().optional(),
  isPrivate: z.boolean().default(false),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-_]+$/).optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
});

export const createChannel = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { name, description, topic, isPrivate } = createChannelSchema.parse(req.body);
  const userId = req.userId!;

  // Check if user is member of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Check if channel name already exists in workspace
  const existing = await pool.query(
    'SELECT id FROM channels WHERE workspace_id = $1 AND name = $2',
    [workspaceId, name]
  );

  if (existing.rows.length > 0) {
    throw new BadRequestError('Channel name already exists in this workspace');
  }

    // Create channel
    const result = await pool.query(
      `INSERT INTO channels (workspace_id, name, description, topic, is_private, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, workspace_id, name, description, topic, is_private, is_archived, created_by, created_at, updated_at`,
      [workspaceId, name, description || null, topic || null, isPrivate, userId]
    );

    const channel = result.rows[0];

    // Add creator as admin member
    await pool.query(
      `INSERT INTO channel_members (channel_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [channel.id, userId, 'admin']
    );

  res.status(201).json({
    id: channel.id,
    workspaceId: channel.workspace_id,
    name: channel.name,
    description: channel.description,
    topic: channel.topic,
    isPrivate: channel.is_private,
    isArchived: channel.is_archived,
    createdBy: channel.created_by,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
  });
};

export const getChannels = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check if user is member of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

    // Get all public channels and private channels user is member of
    const result = await pool.query(
      `SELECT DISTINCT c.id, c.workspace_id, c.name, c.description, c.topic,
              c.is_private, c.is_archived, c.created_by, c.created_at, c.updated_at,
              cm.role as user_role,
              cm.notifications_enabled,
              CASE WHEN cm.user_id IS NOT NULL THEN true ELSE false END as is_member,
              CASE WHEN sc.id IS NOT NULL THEN true ELSE false END as is_starred
       FROM channels c
       LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
       LEFT JOIN starred_channels sc ON c.id = sc.channel_id AND sc.user_id = $2
       WHERE c.workspace_id = $1
         AND (c.is_private = false OR cm.user_id IS NOT NULL)
         AND c.is_archived = false
       ORDER BY c.created_at ASC`,
      [workspaceId, userId]
    );

    const channels = result.rows.map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description,
      topic: row.topic,
      isPrivate: row.is_private,
      isArchived: row.is_archived,
      createdBy: row.created_by,
      isMember: row.is_member,
      userRole: row.user_role,
      isMuted: row.is_member ? !row.notifications_enabled : false,
      isStarred: row.is_starred,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

  res.json({ channels });
};

export const getChannel = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = req.params;
  const userId = req.userId!;

  // Check if user is member of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

    const result = await pool.query(
      `SELECT c.id, c.workspace_id, c.name, c.description, c.topic,
              c.is_private, c.is_archived, c.created_by, c.created_at, c.updated_at,
              cm.role as user_role
       FROM channels c
       LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $3
       WHERE c.id = $1 AND c.workspace_id = $2`,
      [channelId, workspaceId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Channel not found');
    }

    const channel = result.rows[0];

    // If channel is private, user must be a member
    if (channel.is_private && !channel.user_role) {
      throw new ForbiddenError('Not a member of this private channel');
    }

  res.json({
    id: channel.id,
    workspaceId: channel.workspace_id,
    name: channel.name,
    description: channel.description,
    topic: channel.topic,
    isPrivate: channel.is_private,
    isArchived: channel.is_archived,
    createdBy: channel.created_by,
    userRole: channel.user_role,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
  });
};

export const updateChannel = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = req.params;
  const userId = req.userId!;
  const updates = updateChannelSchema.parse(req.body);

  // Check if user is admin of channel
  const memberCheck = await pool.query(
    'SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
    throw new ForbiddenError('Insufficient permissions');
  }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      // Check if new name already exists
      const existing = await pool.query(
        'SELECT id FROM channels WHERE workspace_id = $1 AND name = $2 AND id != $3',
        [workspaceId, updates.name, channelId]
      );

      if (existing.rows.length > 0) {
        throw new BadRequestError('Channel name already exists');
      }

      updateFields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    if (updates.topic !== undefined) {
      updateFields.push(`topic = $${paramCount++}`);
      values.push(updates.topic);
    }

    if (updateFields.length === 0) {
      throw new BadRequestError('No fields to update');
    }

    values.push(channelId);

    const result = await pool.query(
      `UPDATE channels
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, workspace_id, name, description, topic, is_private, is_archived, created_by, created_at, updated_at`,
      values
    );

    const channel = result.rows[0];

    res.json({
      id: channel.id,
      workspaceId: channel.workspace_id,
      name: channel.name,
      description: channel.description,
      topic: channel.topic,
      isPrivate: channel.is_private,
      isArchived: channel.is_archived,
      createdBy: channel.created_by,
      createdAt: channel.created_at,
      updatedAt: channel.updated_at,
    });
};

export const deleteChannel = async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const userId = req.userId!;

  // Don't allow deleting #general
  const channel = await pool.query(
    'SELECT name FROM channels WHERE id = $1',
    [channelId]
  );

  if (channel.rows.length === 0) {
    throw new NotFoundError('Channel not found');
  }

  if (channel.rows[0].name === 'general') {
    throw new BadRequestError('Cannot delete #general channel');
  }

  // Check if user is admin of channel
  const memberCheck = await pool.query(
    'SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
    throw new ForbiddenError('Insufficient permissions');
  }

    await pool.query('DELETE FROM channels WHERE id = $1', [channelId]);

    res.json({ message: 'Channel deleted successfully' });
};

export const joinChannel = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = req.params;
  const userId = req.userId!;

  // Check if user is member of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Check if channel exists and is public
  const channel = await pool.query(
    'SELECT is_private FROM channels WHERE id = $1 AND workspace_id = $2',
    [channelId, workspaceId]
  );

  if (channel.rows.length === 0) {
    throw new NotFoundError('Channel not found');
  }

  if (channel.rows[0].is_private) {
    throw new ForbiddenError('Cannot join private channel without invitation');
  }

  // Check if already a member
  const existing = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (existing.rows.length > 0) {
    throw new BadRequestError('Already a member of this channel');
  }

    // Join channel
    await pool.query(
      `INSERT INTO channel_members (channel_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [channelId, userId, 'member']
    );

    res.json({ message: 'Joined channel successfully' });
};

export const leaveChannel = async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const userId = req.userId!;

  // Don't allow leaving #general
  const channel = await pool.query(
    'SELECT name FROM channels WHERE id = $1',
    [channelId]
  );

  if (channel.rows.length === 0) {
    throw new NotFoundError('Channel not found');
  }

  if (channel.rows[0].name === 'general') {
    throw new BadRequestError('Cannot leave #general channel');
  }

    await pool.query(
      'DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );

    res.json({ message: 'Left channel successfully' });
};

export const muteChannel = async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const userId = req.userId!;

  // Verify user is member of channel
  const memberCheck = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

  // Update notifications_enabled to false
  await pool.query(
    'UPDATE channel_members SET notifications_enabled = false WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  logger.info(`Channel ${channelId} muted by user ${userId}`);

  res.json({ message: 'Channel muted successfully', muted: true });
};

export const unmuteChannel = async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const userId = req.userId!;

  // Verify user is member of channel
  const memberCheck = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

  // Update notifications_enabled to true
  await pool.query(
    'UPDATE channel_members SET notifications_enabled = true WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  logger.info(`Channel ${channelId} unmuted by user ${userId}`);

  res.json({ message: 'Channel unmuted successfully', muted: false });
};

export const browseChannels = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check if user is member of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Get ALL channels (public and private user is member of) with member counts
  const result = await pool.query(
    `SELECT c.id, c.workspace_id, c.name, c.description, c.topic,
            c.is_private, c.is_archived, c.created_by, c.created_at, c.updated_at,
            cm.role as user_role,
            CASE WHEN cm.user_id IS NOT NULL THEN true ELSE false END as is_member,
            (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count
     FROM channels c
     LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
     WHERE c.workspace_id = $1
       AND c.is_archived = false
     ORDER BY c.is_private ASC, c.name ASC`,
    [workspaceId, userId]
  );

  const channels = result.rows.map(row => ({
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    topic: row.topic,
    isPrivate: row.is_private,
    isArchived: row.is_archived,
    createdBy: row.created_by,
    isMember: row.is_member,
    userRole: row.user_role,
    memberCount: parseInt(row.member_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({ channels });
};

export const starChannel = async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const userId = req.userId!;

  // Verify user is member of channel
  const memberCheck = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

  // Star the channel
  try {
    const result = await pool.query(
      `INSERT INTO starred_channels (user_id, channel_id)
       VALUES ($1, $2)
       RETURNING id, user_id, channel_id, starred_at`,
      [userId, channelId]
    );

    logger.info(`Channel ${channelId} starred by user ${userId}`);

    res.status(201).json({
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      channelId: result.rows[0].channel_id,
      starredAt: result.rows[0].starred_at,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      throw new BadRequestError('Channel is already starred');
    }
    throw error;
  }
};

export const unstarChannel = async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const userId = req.userId!;

  await pool.query(
    'DELETE FROM starred_channels WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  logger.info(`Channel ${channelId} unstarred by user ${userId}`);

  res.status(204).send();
};

export const getStarredChannels = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Get starred channels for this user in this workspace
  const result = await pool.query(
    `SELECT sc.id as star_id, sc.starred_at,
            c.id, c.workspace_id, c.name, c.description, c.topic,
            c.is_private, c.is_archived, c.created_by, c.created_at, c.updated_at,
            cm.role as user_role
     FROM starred_channels sc
     JOIN channels c ON sc.channel_id = c.id
     LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
     WHERE sc.user_id = $1 AND c.workspace_id = $2
     ORDER BY sc.starred_at DESC`,
    [userId, workspaceId]
  );

  const starredChannels = result.rows.map(row => ({
    starId: row.star_id,
    starredAt: row.starred_at,
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    topic: row.topic,
    isPrivate: row.is_private,
    isArchived: row.is_archived,
    createdBy: row.created_by,
    userRole: row.user_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({ starredChannels });
};