import { Router } from 'express';
import * as mindMapController from '../controllers/mindMapController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticateToken);

// Create mind map
router.post('/:workspaceId/mind-maps', asyncHandler(mindMapController.createMindMap));

// Get all mind maps for workspace
router.get('/:workspaceId/mind-maps', asyncHandler(mindMapController.getMindMaps));

// Get specific mind map
router.get('/:workspaceId/mind-maps/:mindMapId', asyncHandler(mindMapController.getMindMap));

// Update mind map
router.put('/:workspaceId/mind-maps/:mindMapId', asyncHandler(mindMapController.updateMindMap));

// Delete mind map
router.delete('/:workspaceId/mind-maps/:mindMapId', asyncHandler(mindMapController.deleteMindMap));

export default router;
