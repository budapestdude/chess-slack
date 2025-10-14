import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const actionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  assignee: z.string(),
  completed: z.boolean(),
});

const createMeetingNoteSchema = z.object({
  title: z.string().min(1).max(255),
  date: z.string().datetime(),
  attendees: z.array(z.string()).optional().default([]),
  agenda: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
  actionItems: z.array(actionItemSchema).optional().default([]),
  template: z.string().max(100).optional().default('general'),
});

const updateMeetingNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  date: z.string().datetime().optional(),
  attendees: z.array(z.string()).optional(),
  agenda: z.array(z.string()).optional(),
  notes: z.string().optional(),
  actionItems: z.array(actionItemSchema).optional(),
  template: z.string().max(100).optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }
}

async function checkMeetingNoteAccess(noteId: string, workspaceId: string, userId: string): Promise<void> {
  const noteCheck = await pool.query(
    'SELECT 1 FROM meeting_notes WHERE id = $1 AND workspace_id = $2',
    [noteId, workspaceId]
  );

  if (noteCheck.rows.length === 0) {
    throw new NotFoundError('Meeting note not found');
  }

  await checkWorkspaceMembership(workspaceId, userId);
}

// ============================================
// MEETING NOTE CONTROLLERS
// ============================================

/**
 * POST /api/workspaces/:workspaceId/meeting-notes
 * Create a new meeting note
 */
export const createMeetingNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate request body
  const data = createMeetingNoteSchema.parse(req.body);

  // Insert meeting note
  const result = await pool.query(
    `INSERT INTO meeting_notes (
      workspace_id, title, date, attendees, agenda, notes, action_items, template, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, workspace_id, title, date, attendees, agenda, notes, action_items, template, created_by, created_at, updated_at`,
    [
      workspaceId,
      data.title,
      data.date,
      JSON.stringify(data.attendees),
      JSON.stringify(data.agenda),
      data.notes,
      JSON.stringify(data.actionItems),
      data.template,
      userId,
    ]
  );

  const meetingNote = result.rows[0];

  logger.info('Meeting note created', { noteId: meetingNote.id, workspaceId, userId });

  res.status(201).json(meetingNote);
});

/**
 * GET /api/workspaces/:workspaceId/meeting-notes/:noteId
 * Get a specific meeting note
 */
export const getMeetingNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, noteId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and note access
  await checkMeetingNoteAccess(noteId, workspaceId, userId);

  // Get meeting note
  const result = await pool.query(
    `SELECT
      mn.id, mn.workspace_id, mn.title, mn.date, mn.attendees, mn.agenda,
      mn.notes, mn.action_items, mn.template, mn.created_by, mn.created_at, mn.updated_at,
      u.username as created_by_username
    FROM meeting_notes mn
    LEFT JOIN users u ON mn.created_by = u.id
    WHERE mn.id = $1`,
    [noteId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Meeting note not found');
  }

  res.json(result.rows[0]);
});

/**
 * GET /api/workspaces/:workspaceId/meeting-notes
 * Get all meeting notes for a workspace
 */
export const getMeetingNotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Get meeting notes
  const result = await pool.query(
    `SELECT
      mn.id, mn.workspace_id, mn.title, mn.date, mn.attendees, mn.agenda,
      mn.notes, mn.action_items, mn.template, mn.created_by, mn.created_at, mn.updated_at,
      u.username as created_by_username
    FROM meeting_notes mn
    LEFT JOIN users u ON mn.created_by = u.id
    WHERE mn.workspace_id = $1
    ORDER BY mn.date DESC, mn.created_at DESC`,
    [workspaceId]
  );

  res.json({ notes: result.rows });
});

/**
 * PUT /api/workspaces/:workspaceId/meeting-notes/:noteId
 * Update a meeting note
 */
export const updateMeetingNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, noteId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and note access
  await checkMeetingNoteAccess(noteId, workspaceId, userId);

  // Validate request body
  const updates = updateMeetingNoteSchema.parse(req.body);

  // Build dynamic update query
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    updateFields.push(`title = $${paramIndex++}`);
    updateValues.push(updates.title);
  }
  if (updates.date !== undefined) {
    updateFields.push(`date = $${paramIndex++}`);
    updateValues.push(updates.date);
  }
  if (updates.attendees !== undefined) {
    updateFields.push(`attendees = $${paramIndex++}`);
    updateValues.push(JSON.stringify(updates.attendees));
  }
  if (updates.agenda !== undefined) {
    updateFields.push(`agenda = $${paramIndex++}`);
    updateValues.push(JSON.stringify(updates.agenda));
  }
  if (updates.notes !== undefined) {
    updateFields.push(`notes = $${paramIndex++}`);
    updateValues.push(updates.notes);
  }
  if (updates.actionItems !== undefined) {
    updateFields.push(`action_items = $${paramIndex++}`);
    updateValues.push(JSON.stringify(updates.actionItems));
  }
  if (updates.template !== undefined) {
    updateFields.push(`template = $${paramIndex++}`);
    updateValues.push(updates.template);
  }

  if (updateFields.length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  updateValues.push(noteId);

  // Update meeting note
  const result = await pool.query(
    `UPDATE meeting_notes
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, workspace_id, title, date, attendees, agenda, notes, action_items, template, created_by, created_at, updated_at`,
    updateValues
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Meeting note not found');
  }

  logger.info('Meeting note updated', { noteId, workspaceId, userId });

  res.json(result.rows[0]);
});

/**
 * DELETE /api/workspaces/:workspaceId/meeting-notes/:noteId
 * Delete a meeting note
 */
export const deleteMeetingNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, noteId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and note access
  await checkMeetingNoteAccess(noteId, workspaceId, userId);

  // Check if user is the creator
  const noteCheck = await pool.query(
    'SELECT created_by FROM meeting_notes WHERE id = $1',
    [noteId]
  );

  if (noteCheck.rows.length === 0) {
    throw new NotFoundError('Meeting note not found');
  }

  if (noteCheck.rows[0].created_by !== userId) {
    throw new ForbiddenError('Only the creator can delete this meeting note');
  }

  // Delete meeting note
  await pool.query('DELETE FROM meeting_notes WHERE id = $1', [noteId]);

  logger.info('Meeting note deleted', { noteId, workspaceId, userId });

  res.json({ message: 'Meeting note deleted successfully' });
});
