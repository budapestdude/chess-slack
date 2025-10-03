import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import {
  ProjectArtifact,
  CodeReview,
  ArtifactType,
  ArtifactStatus,
  ReviewStatus,
  ReviewIssue,
  ReviewSuggestion,
} from '../types/agent';

// Validation schemas
const getArtifactsQuerySchema = z.object({
  taskId: z.string().uuid().optional(),
  artifactType: z.enum(['code', 'config', 'documentation', 'test', 'design']).optional(),
  status: z.enum(['draft', 'review', 'approved', 'deployed']).optional(),
});

const updateArtifactSchema = z.object({
  content: z.string().optional(),
  status: z.enum(['draft', 'review', 'approved', 'deployed']).optional(),
  metadata: z.record(z.any()).optional(),
});

const requestReviewSchema = z.object({
  reviewerAgentId: z.string().uuid().optional(),
  reviewerUserId: z.string().uuid().optional(),
}).refine(data => data.reviewerAgentId || data.reviewerUserId, {
  message: 'Either reviewerAgentId or reviewerUserId must be provided',
});

const submitReviewSchema = z.object({
  status: z.enum(['pending', 'approved', 'changes_requested', 'rejected']),
  comments: z.string().optional(),
  issues: z.array(
    z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      line: z.number().int().positive().optional(),
      message: z.string(),
      category: z.string().optional(),
    })
  ).optional().default([]),
  suggestions: z.array(
    z.object({
      line: z.number().int().positive().optional(),
      message: z.string(),
      suggestedCode: z.string().optional(),
    })
  ).optional().default([]),
});

// Helper function to check workspace membership
async function checkWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }
}

// Helper function to check workspace and artifact existence
async function checkWorkspaceAndArtifact(
  workspaceId: string,
  artifactId: string,
  userId: string
): Promise<ProjectArtifact> {
  await checkWorkspaceMembership(workspaceId, userId);

  const result = await pool.query(
    'SELECT * FROM project_artifacts WHERE id = $1',
    [artifactId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  const artifact = mapRowToArtifact(result.rows[0]);

  if (artifact.workspaceId !== workspaceId) {
    throw new ForbiddenError('Artifact does not belong to this workspace');
  }

  return artifact;
}

// Helper function to map database row to artifact
function mapRowToArtifact(row: any): ProjectArtifact {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    taskId: row.task_id,
    createdByAgentId: row.created_by_agent_id,
    artifactType: row.artifact_type as ArtifactType,
    filePath: row.file_path,
    content: row.content,
    language: row.language,
    version: row.version,
    status: row.status as ArtifactStatus,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper function to map database row to code review
function mapRowToCodeReview(row: any): CodeReview {
  return {
    id: row.id,
    artifactId: row.artifact_id,
    reviewerAgentId: row.reviewer_agent_id,
    reviewerUserId: row.reviewer_user_id,
    status: row.status as ReviewStatus,
    comments: row.comments,
    issues: row.issues || [],
    suggestions: row.suggestions || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * GET /api/workspaces/:workspaceId/artifacts
 * Get artifacts with optional filters
 */
export const getArtifacts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getArtifactsQuerySchema.parse(req.query);

  // Build query
  const conditions: string[] = ['workspace_id = $1'];
  const params: any[] = [workspaceId];
  let paramIndex = 2;

  if (query.taskId) {
    conditions.push(`task_id = $${paramIndex++}`);
    params.push(query.taskId);
  }

  if (query.artifactType) {
    conditions.push(`artifact_type = $${paramIndex++}`);
    params.push(query.artifactType);
  }

  if (query.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(query.status);
  }

  const result = await pool.query(
    `SELECT * FROM project_artifacts
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  );

  const artifacts = result.rows.map(mapRowToArtifact);

  res.json({ artifacts });
});

/**
 * GET /api/workspaces/:workspaceId/artifacts/:artifactId
 * Get artifact details with content
 */
export const getArtifact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, artifactId } = req.params;
  const userId = req.userId!;

  // Check workspace and artifact
  const artifact = await checkWorkspaceAndArtifact(workspaceId, artifactId, userId);

  res.json(artifact);
});

/**
 * PUT /api/workspaces/:workspaceId/artifacts/:artifactId
 * Update artifact content or status
 */
export const updateArtifact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, artifactId } = req.params;
  const userId = req.userId!;

  // Check workspace and artifact
  await checkWorkspaceAndArtifact(workspaceId, artifactId, userId);

  // Validate request body
  const updates = updateArtifactSchema.parse(req.body);

  // Build update query
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.content !== undefined) {
    fields.push(`content = $${paramIndex++}`);
    values.push(updates.content);
    // Increment version when content is updated
    fields.push(`version = version + 1`);
  }

  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (updates.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(updates.metadata));
  }

  if (fields.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  values.push(artifactId);

  const result = await pool.query(
    `UPDATE project_artifacts
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  const artifact = mapRowToArtifact(result.rows[0]);

  logger.info('Artifact updated via API', { artifactId, workspaceId, userId });

  res.json(artifact);
});

/**
 * DELETE /api/workspaces/:workspaceId/artifacts/:artifactId
 * Delete an artifact
 */
export const deleteArtifact = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, artifactId } = req.params;
  const userId = req.userId!;

  // Check workspace and artifact
  await checkWorkspaceAndArtifact(workspaceId, artifactId, userId);

  // Delete artifact
  const result = await pool.query(
    'DELETE FROM project_artifacts WHERE id = $1 RETURNING id',
    [artifactId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  logger.info('Artifact deleted via API', { artifactId, workspaceId, userId });

  res.json({ message: 'Artifact deleted successfully' });
});

/**
 * POST /api/workspaces/:workspaceId/artifacts/:artifactId/review
 * Request a code review
 */
export const requestReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, artifactId } = req.params;
  const userId = req.userId!;

  // Check workspace and artifact
  await checkWorkspaceAndArtifact(workspaceId, artifactId, userId);

  // Validate request body
  const { reviewerAgentId, reviewerUserId } = requestReviewSchema.parse(req.body);

  // Verify reviewer exists
  if (reviewerAgentId) {
    const agentCheck = await pool.query(
      'SELECT id, workspace_id FROM agents WHERE id = $1',
      [reviewerAgentId]
    );

    if (agentCheck.rows.length === 0) {
      throw new NotFoundError('Reviewer agent not found');
    }

    if (agentCheck.rows[0].workspace_id !== workspaceId) {
      throw new BadRequestError('Reviewer agent must be in the same workspace');
    }
  }

  if (reviewerUserId) {
    const userCheck = await pool.query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, reviewerUserId]
    );

    if (userCheck.rows.length === 0) {
      throw new BadRequestError('Reviewer user must be a member of the workspace');
    }
  }

  // Create review request
  const result = await pool.query(
    `INSERT INTO code_reviews (artifact_id, reviewer_agent_id, reviewer_user_id, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [artifactId, reviewerAgentId || null, reviewerUserId || null]
  );

  const review = mapRowToCodeReview(result.rows[0]);

  // Update artifact status to 'review'
  await pool.query(
    'UPDATE project_artifacts SET status = $1, updated_at = NOW() WHERE id = $2',
    ['review', artifactId]
  );

  logger.info('Code review requested via API', {
    artifactId,
    reviewId: review.id,
    reviewerAgentId,
    reviewerUserId,
    workspaceId,
    userId,
  });

  res.status(201).json(review);
});

/**
 * GET /api/workspaces/:workspaceId/artifacts/:artifactId/reviews
 * Get all reviews for an artifact
 */
export const getReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, artifactId } = req.params;
  const userId = req.userId!;

  // Check workspace and artifact
  await checkWorkspaceAndArtifact(workspaceId, artifactId, userId);

  // Get reviews
  const result = await pool.query(
    `SELECT * FROM code_reviews
     WHERE artifact_id = $1
     ORDER BY created_at DESC`,
    [artifactId]
  );

  const reviews = result.rows.map(mapRowToCodeReview);

  res.json({ reviews });
});

/**
 * POST /api/workspaces/:workspaceId/artifacts/:artifactId/reviews
 * Submit a code review
 */
export const submitReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, artifactId } = req.params;
  const userId = req.userId!;

  // Check workspace and artifact
  await checkWorkspaceAndArtifact(workspaceId, artifactId, userId);

  // Validate request body
  const reviewData = submitReviewSchema.parse(req.body);

  // Create review
  const result = await pool.query(
    `INSERT INTO code_reviews (
      artifact_id, reviewer_user_id, status, comments, issues, suggestions
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      artifactId,
      userId,
      reviewData.status,
      reviewData.comments || null,
      JSON.stringify(reviewData.issues),
      JSON.stringify(reviewData.suggestions),
    ]
  );

  const review = mapRowToCodeReview(result.rows[0]);

  // Update artifact status based on review
  let artifactStatus: ArtifactStatus = 'review';
  if (reviewData.status === 'approved') {
    artifactStatus = 'approved';
  } else if (reviewData.status === 'changes_requested' || reviewData.status === 'rejected') {
    artifactStatus = 'draft';
  }

  await pool.query(
    'UPDATE project_artifacts SET status = $1, updated_at = NOW() WHERE id = $2',
    [artifactStatus, artifactId]
  );

  logger.info('Code review submitted via API', {
    artifactId,
    reviewId: review.id,
    reviewStatus: reviewData.status,
    workspaceId,
    userId,
  });

  res.status(201).json(review);
});
