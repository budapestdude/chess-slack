import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as notificationController from '../controllers/notificationController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get notifications for a workspace
router.get('/:workspaceId/notifications', notificationController.getNotifications);

// Get unread count
router.get('/:workspaceId/notifications/unread-count', notificationController.getUnreadCount);

// Mark all notifications as read
router.put('/:workspaceId/notifications/read-all', notificationController.markAllAsRead);

// Mark notification as read
router.put('/:workspaceId/notifications/:notificationId/read', notificationController.markAsRead);

// Delete notification
router.delete('/:workspaceId/notifications/:notificationId', notificationController.deleteNotification);

export default router;