import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import analyticsService from '../services/analyticsService';
import {
  RecentActivityResponse,
  UserProductivityResponse,
  WorkspaceActivitySummaryResponse,
  AllAnalyticsResponse,
} from '../types/analytics';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const getRecentActivityQuerySchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).optional().default('50'),
  offset: z.string().transform(val => parseInt(val, 10)).optional().default('0'),
});

const getUserProductivityQuerySchema = z.object({
  days: z.string().transform(val => parseInt(val, 10)).optional().default('7'),
});

const getWorkspaceActivitySummaryQuerySchema = z.object({
  days: z.string().transform(val => parseInt(val, 10)).optional().default('7'),
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

// ============================================
// ANALYTICS CONTROLLERS
// ============================================

/**
 * GET /api/workspaces/:workspaceId/analytics/overview
 * Get workspace overview with real-time stats
 */
export const getWorkspaceOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Get workspace overview
  const overview = await analyticsService.getWorkspaceOverview(workspaceId);

  if (!overview) {
    throw new NotFoundError('Workspace not found');
  }

  logger.info('Workspace overview retrieved', { workspaceId, userId });

  res.json(overview);
});

/**
 * GET /api/workspaces/:workspaceId/analytics/activity
 * Get recent workspace activity with pagination
 */
export const getRecentActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getRecentActivityQuerySchema.parse(req.query);

  // Get recent activity
  const activities = await analyticsService.getRecentActivity(
    workspaceId,
    query.limit,
    query.offset
  );

  const response: RecentActivityResponse = {
    activities,
    total: activities.length,
    limit: query.limit,
    offset: query.offset,
  };

  logger.info('Recent activity retrieved', { workspaceId, userId, count: activities.length });

  res.json(response);
});

/**
 * GET /api/workspaces/:workspaceId/analytics/productivity
 * Get user productivity metrics
 */
export const getUserProductivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getUserProductivityQuerySchema.parse(req.query);

  // Get user productivity
  const data = await analyticsService.getUserProductivity(userId, workspaceId, query.days);

  const response: UserProductivityResponse = {
    userId,
    workspaceId,
    days: query.days,
    data,
  };

  logger.info('User productivity retrieved', { workspaceId, userId, days: query.days });

  res.json(response);
});

/**
 * GET /api/workspaces/:workspaceId/analytics/summary
 * Get workspace activity summary
 */
export const getWorkspaceActivitySummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getWorkspaceActivitySummaryQuerySchema.parse(req.query);

  // Get workspace activity summary
  const data = await analyticsService.getWorkspaceActivitySummary(workspaceId, query.days);

  const response: WorkspaceActivitySummaryResponse = {
    workspaceId,
    days: query.days,
    data,
  };

  logger.info('Workspace activity summary retrieved', { workspaceId, userId, days: query.days });

  res.json(response);
});

/**
 * GET /api/workspaces/:workspaceId/analytics/tasks
 * Get task analytics
 */
export const getTaskAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Get task analytics (user-specific)
  const analytics = await analyticsService.getTaskAnalytics(workspaceId, userId);

  logger.info('Task analytics retrieved', { workspaceId, userId });

  res.json(analytics || {});
});

/**
 * GET /api/workspaces/:workspaceId/analytics/documents
 * Get document analytics
 */
export const getDocumentAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Get document analytics (user-specific)
  const analytics = await analyticsService.getDocumentAnalytics(workspaceId, userId);

  logger.info('Document analytics retrieved', { workspaceId, userId });

  res.json(analytics || {});
});

/**
 * GET /api/workspaces/:workspaceId/analytics/events
 * Get event analytics
 */
export const getEventAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Get event analytics (user-specific)
  const analytics = await analyticsService.getEventAnalytics(workspaceId, userId);

  logger.info('Event analytics retrieved', { workspaceId, userId });

  res.json(analytics || {});
});

/**
 * GET /api/workspaces/:workspaceId/analytics
 * Get all analytics in one response (combined endpoint)
 */
export const getAllAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Fetch all analytics in parallel
  const [overview, taskAnalytics, documentAnalytics, eventAnalytics, recentActivity] = await Promise.all([
    analyticsService.getWorkspaceOverview(workspaceId),
    analyticsService.getTaskAnalytics(workspaceId, userId),
    analyticsService.getDocumentAnalytics(workspaceId, userId),
    analyticsService.getEventAnalytics(workspaceId, userId),
    analyticsService.getRecentActivity(workspaceId, 10, 0),
  ]);

  if (!overview) {
    throw new NotFoundError('Workspace not found');
  }

  const response: AllAnalyticsResponse = {
    overview,
    taskAnalytics,
    documentAnalytics,
    eventAnalytics,
    recentActivity,
  };

  logger.info('All analytics retrieved', { workspaceId, userId });

  res.json(response);
});
