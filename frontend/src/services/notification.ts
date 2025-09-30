import api from './api';

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string;
  type: 'mention' | 'dm' | 'channel_message' | 'system';
  title: string;
  content?: string;
  link?: string;
  isRead: boolean;
  messageId?: string;
  channelId?: string;
  dmGroupId?: string;
  actorId?: string;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

class NotificationService {
  async getNotifications(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    const response = await api.get(
      `/workspaces/${workspaceId}/notifications`,
      {
        params: { limit, offset },
      }
    );
    return response.data;
  }

  async getUnreadCount(workspaceId: string): Promise<number> {
    const response = await api.get(
      `/workspaces/${workspaceId}/notifications/unread-count`
    );
    return response.data.count;
  }

  async markAsRead(workspaceId: string, notificationId: string): Promise<void> {
    await api.put(
      `/workspaces/${workspaceId}/notifications/${notificationId}/read`
    );
  }

  async markAllAsRead(workspaceId: string): Promise<void> {
    await api.put(`/workspaces/${workspaceId}/notifications/read-all`);
  }

  async deleteNotification(workspaceId: string, notificationId: string): Promise<void> {
    await api.delete(
      `/workspaces/${workspaceId}/notifications/${notificationId}`
    );
  }
}

export const notificationService = new NotificationService();