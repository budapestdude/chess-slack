import { Router } from 'express';
import * as searchController from '../controllers/searchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Global workspace search
router.get('/:workspaceId/search', searchController.search);

// Channel-specific message search
router.get('/:workspaceId/channels/:channelId/search', searchController.searchMessages);

// Saved searches
router.post('/:workspaceId/saved-searches', searchController.createSavedSearch);
router.get('/:workspaceId/saved-searches', searchController.getSavedSearches);
router.delete('/:workspaceId/saved-searches/:savedSearchId', searchController.deleteSavedSearch);

// Search history
router.get('/:workspaceId/search-history', searchController.getSearchHistory);

export default router;