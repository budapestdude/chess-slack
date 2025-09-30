import { Router } from 'express';
import * as dmController from '../controllers/dmController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All DM routes require authentication
router.use(authenticateToken);

// Create or get existing DM
router.post('/create', dmController.getOrCreateDM);

// Get all DMs for user in workspace
router.get('/workspace/:workspaceId', dmController.getUserDMs);

// Get messages in a DM
router.get('/:dmGroupId/messages', dmController.getDMMessages);

// Send message to DM
router.post('/:dmGroupId/messages', dmController.sendDMMessage);

export default router;