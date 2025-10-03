import { Router } from 'express';
import * as uploadController from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// File upload (supports multiple files)
router.post(
  '/:workspaceId/upload',
  authenticateToken,
  upload.array('files', 10), // Max 10 files per upload
  uploadController.uploadFile
);

// Get attachment (download)
router.get('/attachments/:attachmentId', authenticateToken, uploadController.getAttachment);

// Delete attachment
router.delete('/attachments/:attachmentId', authenticateToken, uploadController.deleteAttachment);

// Get workspace attachments (with filters)
router.get('/:workspaceId/attachments', authenticateToken, uploadController.getWorkspaceAttachments);

export default router;
