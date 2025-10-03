import { Router } from 'express';
import * as channelController from '../controllers/channelController';
import * as archiveController from '../controllers/archiveController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply auth per-route instead of globally to avoid blocking other routers
router.post('/:workspaceId/channels', authenticateToken, channelController.createChannel);
router.get('/:workspaceId/channels', authenticateToken, channelController.getChannels);
router.get('/:workspaceId/channels/browse/all', authenticateToken, channelController.browseChannels);
router.get('/:workspaceId/channels/:channelId', authenticateToken, channelController.getChannel);
router.put('/:workspaceId/channels/:channelId', authenticateToken, channelController.updateChannel);
router.delete('/:workspaceId/channels/:channelId', authenticateToken, channelController.deleteChannel);
router.post('/:workspaceId/channels/:channelId/join', authenticateToken, channelController.joinChannel);
router.post('/:workspaceId/channels/:channelId/leave', authenticateToken, channelController.leaveChannel);

// Channel muting
router.post('/:workspaceId/channels/:channelId/mute', authenticateToken, channelController.muteChannel);
router.post('/:workspaceId/channels/:channelId/unmute', authenticateToken, channelController.unmuteChannel);

// Starred channels
router.post('/:workspaceId/channels/:channelId/star', authenticateToken, channelController.starChannel);
router.delete('/:workspaceId/channels/:channelId/star', authenticateToken, channelController.unstarChannel);
router.get('/:workspaceId/channels/starred/list', authenticateToken, channelController.getStarredChannels);

// Channel archiving
router.post('/:workspaceId/channels/:channelId/archive', authenticateToken, archiveController.archiveChannel);
router.post('/:workspaceId/channels/:channelId/unarchive', authenticateToken, archiveController.unarchiveChannel);
router.get('/:workspaceId/channels/archived/list', authenticateToken, archiveController.getArchivedChannels);
router.get('/:workspaceId/channels/:channelId/export', authenticateToken, archiveController.exportChannelHistory);

export default router;