import { Router } from 'express';
import * as draftController from '../controllers/draftController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticateToken);

// Save or update draft
router.post('/:workspaceId/drafts', asyncHandler(draftController.saveDraft));

// Get all drafts for user in workspace
router.get('/:workspaceId/drafts', asyncHandler(draftController.getDrafts));

// Get specific draft by location (channelId or dmGroupId query param)
router.get('/:workspaceId/draft', asyncHandler(draftController.getDraft));

// Delete draft by ID
router.delete('/:workspaceId/drafts/:draftId', asyncHandler(draftController.deleteDraft));

// Delete draft by location (channelId or dmGroupId query param)
router.delete('/:workspaceId/draft', asyncHandler(draftController.deleteDraftByLocation));

export default router;
