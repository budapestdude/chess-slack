import { Router } from 'express';
import * as channelController from '../controllers/channelController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply auth per-route instead of globally to avoid blocking other routers
router.post('/:workspaceId/channels', authenticateToken, channelController.createChannel);
router.get('/:workspaceId/channels', authenticateToken, channelController.getChannels);
router.get('/:workspaceId/channels/:channelId', authenticateToken, channelController.getChannel);
router.put('/:workspaceId/channels/:channelId', authenticateToken, channelController.updateChannel);
router.delete('/:workspaceId/channels/:channelId', authenticateToken, channelController.deleteChannel);
router.post('/:workspaceId/channels/:channelId/join', authenticateToken, channelController.joinChannel);
router.post('/:workspaceId/channels/:channelId/leave', authenticateToken, channelController.leaveChannel);

export default router;