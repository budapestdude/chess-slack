import { Response } from 'express';
import { AuthRequest } from '../types';
import notificationService from '../services/notificationService';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { workspaceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await notificationService.getUserNotifications(
      userId,
      workspaceId,
      limit,
      offset
    );

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { workspaceId } = req.params;

    const count = await notificationService.getUnreadCount(userId, workspaceId);

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { notificationId } = req.params;

    await notificationService.markAsRead(notificationId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { workspaceId } = req.params;

    await notificationService.markAllAsRead(userId, workspaceId);

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(notificationId, userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};