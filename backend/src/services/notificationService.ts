import pool from '../database/db';
import { io } from '../index';

export interface NotificationData {
  userId: string;
  workspaceId: string;
  type: 'mention' | 'dm' | 'channel_message' | 'system';
  title: string;
  content?: string;
  link?: string;
  messageId?: string;
  channelId?: string;
  dmGroupId?: string;
  actorId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  content: string;
  link: string;
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
    avatarUrl: string;
  };
}

class NotificationService {
  async createNotification(data: NotificationData): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, workspace_id, type, title, content, link, message_id, channel_id, dm_group_id, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.userId,
        data.workspaceId,
        data.type,
        data.title,
        data.content || null,
        data.link || null,
        data.messageId || null,
        data.channelId || null,
        data.dmGroupId || null,
        data.actorId || null,
      ]
    );

    const notification = result.rows[0];

    // Fetch actor details if provided
    let actor;
    if (data.actorId) {
      const actorResult = await pool.query(
        'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
        [data.actorId]
      );
      if (actorResult.rows.length > 0) {
        actor = actorResult.rows[0];
      }
    }

    const formattedNotification = {
      id: notification.id,
      userId: notification.user_id,
      workspaceId: notification.workspace_id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      link: notification.link,
      isRead: notification.is_read,
      messageId: notification.message_id,
      channelId: notification.channel_id,
      dmGroupId: notification.dm_group_id,
      actorId: notification.actor_id,
      createdAt: notification.created_at,
      actor: actor
        ? {
            id: actor.id,
            username: actor.username,
            displayName: actor.display_name,
            avatarUrl: actor.avatar_url,
          }
        : undefined,
    };

    // Broadcast notification via WebSocket
    io.to(`user:${data.userId}`).emit('new-notification', formattedNotification);

    return formattedNotification;
  }

  async getUserNotifications(
    userId: string,
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    const result = await pool.query(
      `SELECT n.*,
              u.id as actor_id, u.username as actor_username,
              u.display_name as actor_display_name, u.avatar_url as actor_avatar_url
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = $1 AND n.workspace_id = $2
       ORDER BY n.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, workspaceId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      workspaceId: row.workspace_id,
      type: row.type,
      title: row.title,
      content: row.content,
      link: row.link,
      isRead: row.is_read,
      messageId: row.message_id,
      channelId: row.channel_id,
      dmGroupId: row.dm_group_id,
      actorId: row.actor_id,
      createdAt: row.created_at,
      actor: row.actor_id
        ? {
            id: row.actor_id,
            username: row.actor_username,
            displayName: row.actor_display_name,
            avatarUrl: row.actor_avatar_url,
          }
        : undefined,
    }));
  }

  async getUnreadCount(userId: string, workspaceId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND workspace_id = $2 AND is_read = false',
      [userId, workspaceId]
    );
    return parseInt(result.rows[0].count);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  async markAllAsRead(userId: string, workspaceId: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND workspace_id = $2 AND is_read = false',
      [userId, workspaceId]
    );
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  // Helper to extract user IDs from mentions in message content
  extractMentionedUsers(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]); // Username
    }

    return mentions;
  }

  // Helper to create mention notifications
  async notifyMentions(
    messageId: string,
    messageContent: string,
    mentionedUsernames: string[],
    workspaceId: string,
    channelId: string | null,
    dmGroupId: string | null,
    actorId: string
  ): Promise<void> {
    if (mentionedUsernames.length === 0) return;

    // Get user IDs from usernames
    const usersResult = await pool.query(
      'SELECT id FROM users WHERE username = ANY($1)',
      [mentionedUsernames]
    );

    const mentionedUserIds = usersResult.rows.map((row) => row.id);

    const actorResult = await pool.query(
      'SELECT username, display_name FROM users WHERE id = $1',
      [actorId]
    );
    const actor = actorResult.rows[0];

    const link = channelId
      ? `/workspace/${workspaceId}/channel/${channelId}?message=${messageId}`
      : `/workspace/${workspaceId}/dm/${dmGroupId}?message=${messageId}`;

    for (const userId of mentionedUserIds) {
      if (userId === actorId) continue; // Don't notify self

      await this.createNotification({
        userId,
        workspaceId,
        type: 'mention',
        title: `${actor.display_name || actor.username} mentioned you`,
        content: messageContent.substring(0, 200),
        link,
        messageId,
        channelId: channelId || undefined,
        dmGroupId: dmGroupId || undefined,
        actorId,
      });
    }
  }

  // Helper to create DM notifications
  async notifyDM(
    messageId: string,
    messageContent: string,
    recipientUserIds: string[],
    workspaceId: string,
    dmGroupId: string,
    actorId: string
  ): Promise<void> {
    const actorResult = await pool.query(
      'SELECT username, display_name FROM users WHERE id = $1',
      [actorId]
    );
    const actor = actorResult.rows[0];

    const link = `/workspace/${workspaceId}/dm/${dmGroupId}?message=${messageId}`;

    for (const userId of recipientUserIds) {
      if (userId === actorId) continue; // Don't notify self

      await this.createNotification({
        userId,
        workspaceId,
        type: 'dm',
        title: `${actor.display_name || actor.username} sent you a message`,
        content: messageContent.substring(0, 200),
        link,
        messageId,
        dmGroupId,
        actorId,
      });
    }
  }
}

export default new NotificationService();