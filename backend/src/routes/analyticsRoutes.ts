import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Combined analytics endpoint (must come first)
router.get('/:workspaceId/analytics', authenticateToken, analyticsController.getAllAnalytics);

// Overview
router.get('/:workspaceId/analytics/overview', authenticateToken, analyticsController.getWorkspaceOverview);

// Activity feed
router.get('/:workspaceId/analytics/activity', authenticateToken, analyticsController.getRecentActivity);

// User productivity
router.get('/:workspaceId/analytics/productivity', authenticateToken, analyticsController.getUserProductivity);

// Workspace summary
router.get('/:workspaceId/analytics/summary', authenticateToken, analyticsController.getWorkspaceActivitySummary);

// Analytics by category
router.get('/:workspaceId/analytics/tasks', authenticateToken, analyticsController.getTaskAnalytics);
router.get('/:workspaceId/analytics/documents', authenticateToken, analyticsController.getDocumentAnalytics);
router.get('/:workspaceId/analytics/events', authenticateToken, analyticsController.getEventAnalytics);

export default router;
