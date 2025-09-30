import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description } = createWorkspaceSchema.parse(req.body);
    const userId = req.userId!;

    // Check if slug already exists
    const existing = await pool.query('SELECT id FROM workspaces WHERE slug = $1', [slug]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Workspace slug already exists' });
    }

    // Create workspace
    const result = await pool.query(
      `INSERT INTO workspaces (name, slug, description, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, description, logo_url, owner_id, created_at, updated_at`,
      [name, slug, description || null, userId]
    );

    const workspace = result.rows[0];

    // Add creator as owner member
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [workspace.id, userId, 'owner']
    );

    // Create default #general channel
    const channelResult = await pool.query(
      `INSERT INTO channels (workspace_id, name, description, is_private, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [workspace.id, 'general', 'General discussion', false, userId]
    );

    // Add creator to general channel
    await pool.query(
      `INSERT INTO channel_members (channel_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [channelResult.rows[0].id, userId, 'admin']
    );

    res.status(201).json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logoUrl: workspace.logo_url,
      ownerId: workspace.owner_id,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create workspace error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(
      `SELECT w.id, w.name, w.slug, w.description, w.logo_url, w.owner_id,
              wm.role, w.created_at, w.updated_at
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );

    const workspaces = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      logoUrl: row.logo_url,
      ownerId: row.owner_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ workspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId!;

    // Check if user is member
    const memberCheck = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    const result = await pool.query(
      `SELECT id, name, slug, description, logo_url, owner_id, created_at, updated_at
       FROM workspaces WHERE id = $1`,
      [workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = result.rows[0];

    res.json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logoUrl: workspace.logo_url,
      ownerId: workspace.owner_id,
      role: memberCheck.rows[0].role,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId!;
    const updates = updateWorkspaceSchema.parse(req.body);

    // Check if user is owner or admin
    const memberCheck = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    if (updates.logoUrl !== undefined) {
      updateFields.push(`logo_url = $${paramCount++}`);
      values.push(updates.logoUrl);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(workspaceId);

    const result = await pool.query(
      `UPDATE workspaces
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, slug, description, logo_url, owner_id, created_at, updated_at`,
      values
    );

    const workspace = result.rows[0];

    res.json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logoUrl: workspace.logo_url,
      ownerId: workspace.owner_id,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update workspace error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId!;

    // Check if user is owner
    const workspace = await pool.query(
      'SELECT owner_id FROM workspaces WHERE id = $1',
      [workspaceId]
    );

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (workspace.rows[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Only the owner can delete the workspace' });
    }

    await pool.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWorkspaceMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { search } = req.query;
    const userId = req.userId!;

    // Check if user is member
    const memberCheck = await pool.query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    let query = `
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.status,
             u.custom_status, u.status_emoji,
             COALESCE(up.status, 'offline') as presence_status
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      LEFT JOIN user_presence up ON u.id = up.user_id
      WHERE wm.workspace_id = $1
    `;
    const values: any[] = [workspaceId];

    if (search && typeof search === 'string') {
      query += ` AND (u.username ILIKE $2 OR u.display_name ILIKE $2)`;
      values.push(`%${search}%`);
    }

    query += ` ORDER BY u.username ASC`;

    const result = await pool.query(query, values);

    const members = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      status: row.status,
    }));

    res.json({ members });
  } catch (error) {
    console.error('Get workspace members error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};