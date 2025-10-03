import { Router } from 'express';
import * as draftController from '../controllers/draftController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Save or update draft
router.post('/:workspaceId/drafts', draftController.saveDraft);

// Get all drafts for user in workspace
router.get('/:workspaceId/drafts', draftController.getDrafts);

// Get specific draft by location (channelId or dmGroupId query param)
router.get('/:workspaceId/draft', draftController.getDraft);

// Delete draft by ID
router.delete('/:workspaceId/drafts/:draftId', draftController.deleteDraft);

// Delete draft by location (channelId or dmGroupId query param)
router.delete('/:workspaceId/draft', draftController.deleteDraftByLocation);

export default router;
