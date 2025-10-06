import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import logger from '../utils/logger';

const createMindMapSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  data: z.object({
    nodes: z.array(z.any()),
    theme: z.string().optional(),
    connectionStyle: z.string().optional(),
    showGrid: z.boolean().optional(),
  }),
});

const updateMindMapSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  data: z.object({
    nodes: z.array(z.any()),
    theme: z.string().optional(),
    connectionStyle: z.string().optional(),
    showGrid: z.boolean().optional(),
  }).optional(),
});

export const createMindMap = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const { name, description, data } = createMindMapSchema.parse(req.body);

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const result = await pool.query(
    `INSERT INTO mind_maps (workspace_id, user_id, name, description, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, workspace_id, user_id, name, description, data, created_at, updated_at`,
    [workspaceId, userId, name, description || null, JSON.stringify(data)]
  );

  const mindMap = result.rows[0];

  logger.info('Mind map created', { mindMapId: mindMap.id, workspaceId, userId });

  res.json({
    id: mindMap.id,
    workspaceId: mindMap.workspace_id,
    userId: mindMap.user_id,
    name: mindMap.name,
    description: mindMap.description,
    data: mindMap.data,
    createdAt: mindMap.created_at,
    updatedAt: mindMap.updated_at,
  });
};

export const getMindMaps = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const result = await pool.query(
    `SELECT
      m.id, m.workspace_id, m.user_id, m.name, m.description,
      m.created_at, m.updated_at,
      u.username, u.display_name
     FROM mind_maps m
     JOIN users u ON m.user_id = u.id
     WHERE m.workspace_id = $1
     ORDER BY m.updated_at DESC`,
    [workspaceId]
  );

  const mindMaps = result.rows.map(row => ({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    createdBy: {
      username: row.username,
      displayName: row.display_name,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({ mindMaps });
};

export const getMindMap = async (req: AuthRequest, res: Response) => {
  const { workspaceId, mindMapId } = req.params;
  const userId = req.userId!;

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const result = await pool.query(
    `SELECT
      m.id, m.workspace_id, m.user_id, m.name, m.description, m.data,
      m.created_at, m.updated_at,
      u.username, u.display_name
     FROM mind_maps m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1 AND m.workspace_id = $2`,
    [mindMapId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Mind map not found');
  }

  const row = result.rows[0];

  res.json({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    data: row.data,
    createdBy: {
      username: row.username,
      displayName: row.display_name,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
};

export const updateMindMap = async (req: AuthRequest, res: Response) => {
  const { workspaceId, mindMapId } = req.params;
  const userId = req.userId!;
  const { name, description, data } = updateMindMapSchema.parse(req.body);

  // Verify ownership or workspace membership
  const mindMapCheck = await pool.query(
    `SELECT m.id, m.user_id
     FROM mind_maps m
     JOIN workspace_members wm ON m.workspace_id = wm.workspace_id
     WHERE m.id = $1 AND m.workspace_id = $2 AND wm.user_id = $3`,
    [mindMapId, workspaceId, userId]
  );

  if (mindMapCheck.rows.length === 0) {
    throw new NotFoundError('Mind map not found');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name);
  }

  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }

  if (data !== undefined) {
    updates.push(`data = $${paramCount++}`);
    values.push(JSON.stringify(data));
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  values.push(mindMapId);

  const result = await pool.query(
    `UPDATE mind_maps
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING id, workspace_id, user_id, name, description, data, created_at, updated_at`,
    values
  );

  const mindMap = result.rows[0];

  logger.info('Mind map updated', { mindMapId, workspaceId, userId });

  res.json({
    id: mindMap.id,
    workspaceId: mindMap.workspace_id,
    userId: mindMap.user_id,
    name: mindMap.name,
    description: mindMap.description,
    data: mindMap.data,
    createdAt: mindMap.created_at,
    updatedAt: mindMap.updated_at,
  });
};

export const deleteMindMap = async (req: AuthRequest, res: Response) => {
  const { workspaceId, mindMapId } = req.params;
  const userId = req.userId!;

  // Verify ownership
  const mindMapCheck = await pool.query(
    'SELECT id FROM mind_maps WHERE id = $1 AND workspace_id = $2 AND user_id = $3',
    [mindMapId, workspaceId, userId]
  );

  if (mindMapCheck.rows.length === 0) {
    throw new NotFoundError('Mind map not found or you do not have permission to delete it');
  }

  await pool.query('DELETE FROM mind_maps WHERE id = $1', [mindMapId]);

  logger.info('Mind map deleted', { mindMapId, workspaceId, userId });

  res.json({ message: 'Mind map deleted successfully' });
};
