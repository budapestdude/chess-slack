import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken, authenticateTokenFromQuery } from '../middleware/auth';
import { upload } from '../middleware/upload';
import logger from '../utils/logger';

const router = Router();

// Log all requests to this router
router.use((req, _res, next) => {
  logger.debug('Message router request', { url: req.url, method: req.method });
  next();
});

// File download uses query-based auth (for image previews in browsers)
router.get('/:workspaceId/channels/:channelId/messages/:messageId/attachments/:attachmentId/download', authenticateTokenFromQuery, messageController.downloadAttachment);

// All other routes use header-based auth
router.use(authenticateToken);

// Message CRUD
router.post('/:workspaceId/channels/:channelId/messages', messageController.sendMessage);
router.get('/:workspaceId/channels/:channelId/messages', messageController.getMessages);
router.put('/messages/:messageId', messageController.editMessage);
router.delete('/messages/:messageId', messageController.deleteMessage);

// Message reactions
router.post('/messages/:messageId/reactions', messageController.addReaction);
router.delete('/messages/:messageId/reactions', messageController.removeReaction);

// Message threading
router.get('/:workspaceId/channels/:channelId/messages/:messageId/thread', messageController.getThreadReplies);

// Message pinning
router.post('/messages/:messageId/pin', messageController.pinMessage);
router.delete('/messages/:messageId/pin', messageController.unpinMessage);
router.get('/:workspaceId/channels/:channelId/pinned-messages', messageController.getPinnedMessages);

// Message bookmarking
router.post('/messages/:messageId/bookmark', messageController.bookmarkMessage);
router.delete('/messages/:messageId/bookmark', messageController.unbookmarkMessage);
router.get('/:workspaceId/bookmarked-messages', messageController.getBookmarkedMessages);

// File uploads
router.post('/:workspaceId/channels/:channelId/messages/upload', upload.array('files', 5), messageController.uploadMessageWithAttachments);

export default router;