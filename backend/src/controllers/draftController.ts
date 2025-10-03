import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';

const saveDraftSchema = z.object({
  channelId: z.string().uuid().optional(),
  dmGroupId: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
  metadata: z.record(z.any()).optional(),
  scheduledAt: z.string().optional(),
}).refine((data) => data.channelId || data.dmGroupId, {
  message: 'Either channelId or dmGroupId must be provided',
});

export const saveDraft = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { channelId, dmGroupId, content, metadata, scheduledAt } = saveDraftSchema.parse(req.body);
    const userId = req.userId!;

    // Verify user is member of workspace
    const memberCheck = await pool.query(
      'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new ForbiddenError('Not a member of this workspace');
    }

    // If channel, verify membership
    if (channelId) {
      const channelCheck = await pool.query(
        `SELECT cm.id
         FROM channel_members cm
         JOIN channels c ON cm.channel_id = c.id
         WHERE c.id = $1 AND c.workspace_id = $2 AND cm.user_id = $3`,
        [channelId, workspaceId, userId]
      );

      if (channelCheck.rows.length === 0) {
        throw new ForbiddenError('Not a member of this channel');
      }
    }

    // If DM group, verify membership
    if (dmGroupId) {
      const dmCheck = await pool.query(
        `SELECT dgm.id
         FROM dm_group_members dgm
         JOIN dm_groups dg ON dgm.dm_group_id = dg.id
         WHERE dg.id = $1 AND dg.workspace_id = $2 AND dgm.user_id = $3`,
        [dmGroupId, workspaceId, userId]
      );

      if (dmCheck.rows.length === 0) {
        throw new ForbiddenError('Not a member of this DM group');
      }
    }

    // Check if draft already exists for this location
    const existingDraft = await pool.query(
      `SELECT id FROM message_drafts
       WHERE user_id = $1 AND workspace_id = $2
         AND (channel_id = $3 OR ($3 IS NULL AND channel_id IS NULL))
         AND (dm_group_id = $4 OR ($4 IS NULL AND dm_group_id IS NULL))`,
      [userId, workspaceId, channelId || null, dmGroupId || null]
    );

    let result;
    if (existingDraft.rows.length > 0) {
      // Update existing draft
      result = await pool.query(
        `UPDATE message_drafts
         SET content = $1, metadata = $2, scheduled_at = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, workspace_id, channel_id, dm_group_id, user_id, content, metadata, scheduled_at, created_at, updated_at`,
        [content, JSON.stringify(metadata || {}), scheduledAt || null, existingDraft.rows[0].id]
      );
    } else {
      // Create new draft
      result = await pool.query(
        `INSERT INTO message_drafts (workspace_id, channel_id, dm_group_id, user_id, content, metadata, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, workspace_id, channel_id, dm_group_id, user_id, content, metadata, scheduled_at, created_at, updated_at`,
        [workspaceId, channelId || null, dmGroupId || null, userId, content, JSON.stringify(metadata || {}), scheduledAt || null]
      );
    }

    const draft = result.rows[0];

    res.json({
      id: draft.id,
      workspaceId: draft.workspace_id,
      channelId: draft.channel_id,
      dmGroupId: draft.dm_group_id,
      userId: draft.user_id,
      content: draft.content,
      metadata: draft.metadata,
      scheduledAt: draft.scheduled_at,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid draft data', details: error.errors });
    }
    throw error;
  }
};

export const getDrafts = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  const result = await pool.query(
    `SELECT d.id, d.workspace_id, d.channel_id, d.dm_group_id, d.user_id, d.content,
            d.metadata, d.scheduled_at, d.created_at, d.updated_at,
            c.name as channel_name,
            dg.id as dm_group_id
     FROM message_drafts d
     LEFT JOIN channels c ON d.channel_id = c.id
     LEFT JOIN dm_groups dg ON d.dm_group_id = dg.id
     WHERE d.user_id = $1 AND d.workspace_id = $2
     ORDER BY d.updated_at DESC`,
    [userId, workspaceId]
  );

  const drafts = result.rows.map(row => ({
    id: row.id,
    workspaceId: row.workspace_id,
    channelId: row.channel_id,
    dmGroupId: row.dm_group_id,
    userId: row.user_id,
    content: row.content,
    metadata: row.metadata,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    channelName: row.channel_name,
  }));

  res.json({ drafts });
};

export const getDraft = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId, dmGroupId } = req.query;
  const userId = req.userId!;

  if (!channelId && !dmGroupId) {
    throw new BadRequestError('Either channelId or dmGroupId query parameter is required');
  }

  const result = await pool.query(
    `SELECT id, workspace_id, channel_id, dm_group_id, user_id, content,
            metadata, scheduled_at, created_at, updated_at
     FROM message_drafts
     WHERE user_id = $1 AND workspace_id = $2
       AND (channel_id = $3 OR ($3 IS NULL AND channel_id IS NULL))
       AND (dm_group_id = $4 OR ($4 IS NULL AND dm_group_id IS NULL))`,
    [userId, workspaceId, channelId || null, dmGroupId || null]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  const draft = result.rows[0];

  res.json({
    id: draft.id,
    workspaceId: draft.workspace_id,
    channelId: draft.channel_id,
    dmGroupId: draft.dm_group_id,
    userId: draft.user_id,
    content: draft.content,
    metadata: draft.metadata,
    scheduledAt: draft.scheduled_at,
    createdAt: draft.created_at,
    updatedAt: draft.updated_at,
  });
};

export const deleteDraft = async (req: AuthRequest, res: Response) => {
  const { workspaceId, draftId } = req.params;
  const userId = req.userId!;

  const result = await pool.query(
    'DELETE FROM message_drafts WHERE id = $1 AND user_id = $2 AND workspace_id = $3 RETURNING id',
    [draftId, userId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Draft not found');
  }

  res.json({ message: 'Draft deleted successfully' });
};

export const deleteDraftByLocation = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { channelId, dmGroupId } = req.query;
  const userId = req.userId!;

  if (!channelId && !dmGroupId) {
    throw new BadRequestError('Either channelId or dmGroupId query parameter is required');
  }

  const result = await pool.query(
    `DELETE FROM message_drafts
     WHERE user_id = $1 AND workspace_id = $2
       AND (channel_id = $3 OR ($3 IS NULL AND channel_id IS NULL))
       AND (dm_group_id = $4 OR ($4 IS NULL AND dm_group_id IS NULL))
     RETURNING id`,
    [userId, workspaceId, channelId || null, dmGroupId || null]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  res.json({ message: 'Draft deleted successfully' });
};
