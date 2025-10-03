import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { ForbiddenError, NotFoundError } from '../errors';
import logger from '../utils/logger';
import { io } from '../index';

const archiveChannelSchema = z.object({
  workspaceId: z.string().uuid(),
  channelId: z.string().uuid(),
});

export const archiveChannel = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = archiveChannelSchema.parse({
    workspaceId: req.params.workspaceId,
    channelId: req.params.channelId,
  });
  const userId = req.userId!;

  // Check if user has admin/owner role
  const roleCheck = await pool.query(
    `SELECT cm.role
     FROM channel_members cm
     WHERE cm.channel_id = $1 AND cm.user_id = $2`,
    [channelId, userId]
  );

  if (roleCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

  if (!['admin', 'owner'].includes(roleCheck.rows[0].role)) {
    throw new ForbiddenError('Only admins and owners can archive channels');
  }

  // Archive the channel
  const result = await pool.query(
    `UPDATE channels
     SET is_archived = true,
         archived_at = NOW(),
         archived_by = $1,
         updated_at = NOW()
     WHERE id = $2 AND workspace_id = $3
     RETURNING id, name, is_archived, archived_at, archived_by`,
    [userId, channelId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Channel not found');
  }

  const channel = result.rows[0];

  logger.info('Channel archived', { channelId, userId });

  // Broadcast channel archived event
  io.in(`workspace:${workspaceId}`).emit('channel-archived', {
    channelId: channel.id,
    channelName: channel.name,
    archivedBy: userId,
    archivedAt: channel.archived_at,
  });

  res.json({
    id: channel.id,
    name: channel.name,
    isArchived: channel.is_archived,
    archivedAt: channel.archived_at,
    archivedBy: channel.archived_by,
  });
};

export const unarchiveChannel = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = archiveChannelSchema.parse({
    workspaceId: req.params.workspaceId,
    channelId: req.params.channelId,
  });
  const userId = req.userId!;

  // Check if user has admin/owner role
  const roleCheck = await pool.query(
    `SELECT cm.role
     FROM channel_members cm
     WHERE cm.channel_id = $1 AND cm.user_id = $2`,
    [channelId, userId]
  );

  if (roleCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

  if (!['admin', 'owner'].includes(roleCheck.rows[0].role)) {
    throw new ForbiddenError('Only admins and owners can unarchive channels');
  }

  // Unarchive the channel
  const result = await pool.query(
    `UPDATE channels
     SET is_archived = false,
         archived_at = NULL,
         archived_by = NULL,
         updated_at = NOW()
     WHERE id = $1 AND workspace_id = $2
     RETURNING id, name, is_archived`,
    [channelId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Channel not found');
  }

  const channel = result.rows[0];

  logger.info('Channel unarchived', { channelId, userId });

  // Broadcast channel unarchived event
  io.in(`workspace:${workspaceId}`).emit('channel-unarchived', {
    channelId: channel.id,
    channelName: channel.name,
  });

  res.json({
    id: channel.id,
    name: channel.name,
    isArchived: channel.is_archived,
  });
};

export const getArchivedChannels = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const result = await pool.query(
    `SELECT c.id, c.name, c.description, c.is_private, c.archived_at,
            u.id as archived_by_id, u.username as archived_by_username,
            u.display_name as archived_by_display_name,
            (SELECT COUNT(*) FROM messages WHERE channel_id = c.id) as message_count
     FROM channels c
     LEFT JOIN users u ON c.archived_by = u.id
     WHERE c.workspace_id = $1 AND c.is_archived = true
     ORDER BY c.archived_at DESC`,
    [workspaceId]
  );

  const archivedChannels = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isPrivate: row.is_private,
    archivedAt: row.archived_at,
    archivedBy: row.archived_by_id
      ? {
          id: row.archived_by_id,
          username: row.archived_by_username,
          displayName: row.archived_by_display_name,
        }
      : null,
    messageCount: parseInt(row.message_count),
  }));

  res.json({ archivedChannels });
};

export const exportChannelHistory = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = req.params;
  const userId = req.userId!;

  // Check if user is member of channel or workspace admin
  const accessCheck = await pool.query(
    `SELECT cm.id, wm.role as workspace_role
     FROM channels c
     LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $1
     LEFT JOIN workspace_members wm ON c.workspace_id = wm.workspace_id AND wm.user_id = $1
     WHERE c.id = $2 AND c.workspace_id = $3`,
    [userId, channelId, workspaceId]
  );

  if (accessCheck.rows.length === 0) {
    throw new ForbiddenError('Access denied');
  }

  const hasAccess =
    accessCheck.rows[0].id !== null || ['admin', 'owner'].includes(accessCheck.rows[0].workspace_role);

  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this channel');
  }

  // Get channel details
  const channelResult = await pool.query(
    'SELECT id, name, description, created_at FROM channels WHERE id = $1',
    [channelId]
  );

  if (channelResult.rows.length === 0) {
    throw new NotFoundError('Channel not found');
  }

  const channel = channelResult.rows[0];

  // Get all messages
  const messagesResult = await pool.query(
    `SELECT m.id, m.content, m.created_at, m.updated_at, m.is_edited,
            u.id as user_id, u.username, u.display_name,
            (SELECT json_agg(json_build_object('id', a.id, 'filename', a.filename, 'file_size', a.file_size))
             FROM attachments a WHERE a.message_id = m.id) as attachments
     FROM messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.channel_id = $1 AND m.is_deleted = false
     ORDER BY m.created_at ASC`,
    [channelId]
  );

  const exportData = {
    channel: {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      createdAt: channel.created_at,
    },
    messages: messagesResult.rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isEdited: row.is_edited,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
      },
      attachments: row.attachments || [],
    })),
    exportedAt: new Date().toISOString(),
    exportedBy: userId,
  };

  logger.info('Channel history exported', { channelId, userId });

  res.json(exportData);
};
