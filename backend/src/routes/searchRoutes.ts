import { Router } from 'express';
import * as searchController from '../controllers/searchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Global workspace search
router.get('/:workspaceId/search', searchController.search);

// Channel-specific message search
router.get('/:workspaceId/channels/:channelId/search', searchController.searchMessages);

export default router;