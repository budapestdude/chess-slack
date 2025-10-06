import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { io } from '../index';
import notificationService from '../services/notificationService';
import logger from '../utils/logger';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { validateFileType } from '../middleware/upload';

// Helper to transform relative avatar URLs to full URLs for cross-origin compatibility
const getFullAvatarUrl = (avatarUrl: string | null): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl; // Already a full URL
  }
  const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || '';
  return baseUrl ? `${baseUrl}${avatarUrl}` : avatarUrl;
};

const createMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  parentMessageId: z.string().uuid().optional(),
});

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = req.params;
  const { content, parentMessageId } = createMessageSchema.parse(req.body);
  const userId = req.userId!;

  // Verify user is member of workspace
  const workspaceMember = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (workspaceMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Verify user is member of channel
  const channelMember = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (channelMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

    // Create message
    const result = await pool.query(
      `INSERT INTO messages (workspace_id, channel_id, user_id, content, parent_message_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, workspace_id, channel_id, user_id, content, message_type, metadata,
                 parent_message_id, is_edited, is_deleted, reply_count, last_reply_at, created_at, updated_at`,
      [workspaceId, channelId, userId, content, parentMessageId || null]
    );

    const message = result.rows[0];

    // If this is a thread reply, update parent message reply count
    if (parentMessageId) {
      await pool.query(
        `UPDATE messages
         SET reply_count = reply_count + 1, last_reply_at = NOW()
         WHERE id = $1`,
        [parentMessageId]
      );

      // Emit thread-reply event for real-time updates
      io.in(`channel:${channelId}`).emit('thread-reply', {
        parentMessageId,
        replyCount: message.reply_count + 1,
        lastReplyAt: new Date(),
      });
    }

    // Fetch user details
    const userResult = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const messageWithUser = {
      id: message.id,
      workspaceId: message.workspace_id,
      channelId: message.channel_id,
      dmGroupId: message.dm_group_id,
      userId: message.user_id,
      content: message.content,
      messageType: message.message_type,
      metadata: message.metadata,
      parentMessageId: message.parent_message_id,
      isEdited: message.is_edited,
      isDeleted: message.is_deleted,
      replyCount: message.reply_count || 0,
      lastReplyAt: message.last_reply_at,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
      user: userResult.rows[0],
    };

    // Broadcast message to channel via WebSocket (including sender)
    const roomName = `channel:${channelId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();
    logger.debug('Broadcasting new message to channel', { roomName, socketCount: socketsInRoom.length, messageId: message.id });
    io.in(roomName).emit('new-message', messageWithUser);

    // Create notifications for mentions
    const mentionedUsernames = notificationService.extractMentionedUsers(content);
    if (mentionedUsernames.length > 0) {
      await notificationService.notifyMentions(
        message.id,
        content,
        mentionedUsernames,
        workspaceId,
        channelId,
        null,
        userId
      );

      // Store mentions in message_mentions table
      const mentionedUsers = await pool.query(
        'SELECT id FROM users WHERE username = ANY($1)',
        [mentionedUsernames]
      );

      for (const mentionedUser of mentionedUsers.rows) {
        await pool.query(
          'INSERT INTO message_mentions (message_id, mentioned_user_id, mention_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [message.id, mentionedUser.id, 'user']
        );
      }
    }

    // Handle @channel and @here mentions
    if (content.includes('@channel') || content.includes('@here')) {
      const mentionType = content.includes('@channel') ? 'channel' : 'here';
      await pool.query(
        'INSERT INTO message_mentions (message_id, mention_type) VALUES ($1, $2)',
        [message.id, mentionType]
      );
    }

  res.status(201).json(messageWithUser);
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = req.params;
  const userId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string; // Cursor-based pagination

  // Verify user is member of workspace
  const workspaceMember = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (workspaceMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Verify user is member of channel
  const channelMember = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (channelMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

    // Fetch messages with user details
    let query = `
      SELECT m.id, m.workspace_id, m.channel_id, m.user_id, m.content, m.message_type,
             m.metadata, m.parent_message_id, m.is_edited, m.is_deleted, m.created_at, m.updated_at,
             u.id as user_id, u.username, u.display_name, u.avatar_url,
             (SELECT COUNT(*) FROM messages WHERE parent_message_id = m.id) as reply_count
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = $1 AND m.parent_message_id IS NULL AND m.is_deleted = false
    `;

    const params: any[] = [channelId];

    if (before) {
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Transform results to include user object
    const messages = result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      channelId: row.channel_id,
      userId: row.user_id,
      content: row.content,
      messageType: row.message_type,
      metadata: row.metadata,
      parentMessageId: row.parent_message_id,
      isEdited: row.is_edited,
      isDeleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      replyCount: parseInt(row.reply_count),
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: getFullAvatarUrl(row.avatar_url),
      },
    }));

    // Reverse to show oldest first
    messages.reverse();

  res.json({
    messages,
    hasMore: result.rows.length === limit,
  });
};

export const editMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const { content } = z.object({ content: z.string().min(1).max(10000) }).parse(req.body);
  const userId = req.userId!;

  // Verify message ownership
  const message = await pool.query(
    'SELECT id, channel_id, user_id FROM messages WHERE id = $1',
    [messageId]
  );

  if (message.rows.length === 0) {
    throw new NotFoundError('Message not found');
  }

  if (message.rows[0].user_id !== userId) {
    throw new ForbiddenError('Cannot edit someone else\'s message');
  }

    // Update message
    const result = await pool.query(
      `UPDATE messages
       SET content = $1, is_edited = true, updated_at = NOW()
       WHERE id = $2
       RETURNING id, workspace_id, channel_id, user_id, content, message_type, metadata,
                 parent_message_id, is_edited, is_deleted, created_at, updated_at`,
      [content, messageId]
    );

    const updatedMessage = result.rows[0];

    // Broadcast update via WebSocket (including sender)
    io.in(`channel:${message.rows[0].channel_id}`).emit('message-updated', updatedMessage);

  res.json(updatedMessage);
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  // Verify message ownership or admin role
  const message = await pool.query(
    `SELECT m.id, m.channel_id, m.user_id, cm.role
     FROM messages m
     JOIN channel_members cm ON m.channel_id = cm.channel_id AND cm.user_id = $2
     WHERE m.id = $1`,
    [messageId, userId]
  );

  if (message.rows.length === 0) {
    throw new NotFoundError('Message not found');
  }

  const isOwner = message.rows[0].user_id === userId;
  const isAdmin = message.rows[0].role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Cannot delete this message');
  }

    // Soft delete
    await pool.query(
      'UPDATE messages SET is_deleted = true, content = \'[deleted]\', updated_at = NOW() WHERE id = $1',
      [messageId]
    );

    // Broadcast deletion via WebSocket (including sender)
    io.in(`channel:${message.rows[0].channel_id}`).emit('message-deleted', {
      id: messageId,
      channelId: message.rows[0].channel_id,
    });

  res.json({ message: 'Message deleted successfully' });
};

export const addReaction = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = z.object({ emoji: z.string() }).parse(req.body);
  const userId = req.userId!;

  // Check if reaction already exists
  const existing = await pool.query(
    'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
    [messageId, userId, emoji]
  );

  if (existing.rows.length > 0) {
    throw new BadRequestError('Reaction already exists');
  }

    // Add reaction
    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       RETURNING id, message_id, user_id, emoji, created_at`,
      [messageId, userId, emoji]
    );

    const reaction = result.rows[0];

    // Get channel_id for WebSocket broadcast
    const message = await pool.query(
      'SELECT channel_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (message.rows.length > 0) {
      io.in(`channel:${message.rows[0].channel_id}`).emit('reaction-added', {
        messageId,
        reaction,
      });
    }

  res.status(201).json(reaction);
};

export const removeReaction = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.query;
  const userId = req.userId!;

  await pool.query(
    'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
    [messageId, userId, emoji]
  );

  // Get channel_id for WebSocket broadcast
  const message = await pool.query(
    'SELECT channel_id FROM messages WHERE id = $1',
    [messageId]
  );

  if (message.rows.length > 0) {
    io.in(`channel:${message.rows[0].channel_id}`).emit('reaction-removed', {
      messageId,
      userId,
      emoji,
    });
  }

  res.json({ message: 'Reaction removed successfully' });
};

export const getThreadReplies = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId, messageId } = req.params;
  const userId = req.userId!;

  // Verify user is member of workspace
  const workspaceMember = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (workspaceMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Verify user is member of channel
  const channelMember = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (channelMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

    // Fetch parent message with user details
    const parentResult = await pool.query(
      `SELECT m.id, m.workspace_id, m.channel_id, m.user_id, m.content, m.message_type,
              m.metadata, m.parent_message_id, m.is_edited, m.is_deleted, m.reply_count,
              m.last_reply_at, m.created_at, m.updated_at,
              u.id as user_id, u.username, u.display_name, u.avatar_url
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [messageId]
    );

  if (parentResult.rows.length === 0) {
    throw new NotFoundError('Message not found');
  }

    const parentRow = parentResult.rows[0];
    const parentMessage = {
      id: parentRow.id,
      workspaceId: parentRow.workspace_id,
      channelId: parentRow.channel_id,
      userId: parentRow.user_id,
      content: parentRow.content,
      messageType: parentRow.message_type,
      metadata: parentRow.metadata,
      parentMessageId: parentRow.parent_message_id,
      isEdited: parentRow.is_edited,
      isDeleted: parentRow.is_deleted,
      replyCount: parentRow.reply_count || 0,
      lastReplyAt: parentRow.last_reply_at,
      createdAt: parentRow.created_at,
      updatedAt: parentRow.updated_at,
      user: {
        id: parentRow.user_id,
        username: parentRow.username,
        displayName: parentRow.display_name,
        avatarUrl: getFullAvatarUrl(parentRow.avatar_url),
      },
    };

    // Fetch thread replies
    const repliesResult = await pool.query(
      `SELECT m.id, m.workspace_id, m.channel_id, m.user_id, m.content, m.message_type,
              m.metadata, m.parent_message_id, m.is_edited, m.is_deleted, m.reply_count,
              m.last_reply_at, m.created_at, m.updated_at,
              u.id as user_id, u.username, u.display_name, u.avatar_url
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.parent_message_id = $1 AND m.is_deleted = false
       ORDER BY m.created_at ASC`,
      [messageId]
    );

    const replies = repliesResult.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      channelId: row.channel_id,
      userId: row.user_id,
      content: row.content,
      messageType: row.message_type,
      metadata: row.metadata,
      parentMessageId: row.parent_message_id,
      isEdited: row.is_edited,
      isDeleted: row.is_deleted,
      replyCount: row.reply_count || 0,
      lastReplyAt: row.last_reply_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: getFullAvatarUrl(row.avatar_url),
      },
    }));

  res.json({
    parentMessage,
    replies,
  });
};

export const uploadMessageWithAttachments = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId } = req.params;
  const { content, parentMessageId } = req.body;
  const userId = req.userId!;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new BadRequestError('No files uploaded');
  }

  // Verify user is member of workspace and channel
  const workspaceMember = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (workspaceMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const channelMember = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (channelMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

    // Create message
    const messageResult = await pool.query(
      `INSERT INTO messages (workspace_id, channel_id, user_id, content, parent_message_id, has_attachments, message_type)
       VALUES ($1, $2, $3, $4, $5, true, 'file')
       RETURNING id, workspace_id, channel_id, user_id, content, message_type, metadata,
                 parent_message_id, is_edited, is_deleted, reply_count, last_reply_at, has_attachments, created_at, updated_at`,
      [workspaceId, channelId, userId, content || '', parentMessageId || null]
    );

    const message = messageResult.rows[0];

    // Create organized directory structure
    const uploadDir = path.join('uploads', workspaceId, channelId, message.id);
    await fs.mkdir(uploadDir, { recursive: true });

    // Validate and move files, create attachment records
    const attachments = [];
    for (const file of files) {
      // SECURITY: Validate file type using magic numbers
      const isValidFileType = await validateFileType(file.path, file.mimetype);

      if (!isValidFileType) {
        // Clean up uploaded files if validation fails
        await fs.unlink(file.path).catch(() => {});
        for (const att of attachments) {
          await fs.unlink(path.join(uploadDir, att.filename)).catch(() => {});
        }

        logger.warn('File upload rejected - magic number validation failed', {
          userId,
          filename: file.originalname,
          declaredMimeType: file.mimetype
        });

        throw new BadRequestError(`File type validation failed for ${file.originalname}. The file content does not match the declared type.`);
      }

      const newPath = path.join(uploadDir, file.filename);
      await fs.rename(file.path, newPath);

      const attachmentResult = await pool.query(
        `INSERT INTO attachments (message_id, filename, original_filename, file_path, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, message_id, filename, original_filename, file_size, mime_type, created_at`,
        [message.id, file.filename, file.originalname, newPath, file.size, file.mimetype]
      );

      attachments.push({
        id: attachmentResult.rows[0].id,
        messageId: attachmentResult.rows[0].message_id,
        filename: attachmentResult.rows[0].filename,
        originalFilename: attachmentResult.rows[0].original_filename,
        fileSize: parseInt(attachmentResult.rows[0].file_size),
        mimeType: attachmentResult.rows[0].mime_type,
        createdAt: attachmentResult.rows[0].created_at,
      });
    }

    // Fetch user details
    const userResult = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const messageWithAttachments = {
      id: message.id,
      workspaceId: message.workspace_id,
      channelId: message.channel_id,
      userId: message.user_id,
      content: message.content,
      messageType: message.message_type,
      metadata: message.metadata,
      parentMessageId: message.parent_message_id,
      isEdited: message.is_edited,
      isDeleted: message.is_deleted,
      replyCount: message.reply_count || 0,
      lastReplyAt: message.last_reply_at,
      hasAttachments: message.has_attachments,
      attachments,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
      user: userResult.rows[0],
    };

    // If this is a thread reply, update parent message reply count
    if (parentMessageId) {
      await pool.query(
        `UPDATE messages
         SET reply_count = reply_count + 1, last_reply_at = NOW()
         WHERE id = $1`,
        [parentMessageId]
      );
    }

    // Broadcast message via WebSocket
    io.in(`channel:${channelId}`).emit('new-message', messageWithAttachments);

  res.status(201).json(messageWithAttachments);
};

export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  const { workspaceId, channelId, messageId, attachmentId } = req.params;
  const userId = req.userId!;

  // Verify user is member of workspace
  const workspaceMember = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (workspaceMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Verify user is member of channel
  const channelMember = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (channelMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

  // Get attachment details
  const attachmentResult = await pool.query(
    'SELECT id, file_path, original_filename, mime_type FROM attachments WHERE id = $1 AND message_id = $2',
    [attachmentId, messageId]
  );

  if (attachmentResult.rows.length === 0) {
    throw new NotFoundError('Attachment not found');
  }

  const attachment = attachmentResult.rows[0];

  // SECURITY: Prevent path traversal attacks
  const resolvedPath = path.resolve(attachment.file_path);
  const uploadsDir = path.resolve('uploads');

  // Ensure the file is within the uploads directory
  if (!resolvedPath.startsWith(uploadsDir)) {
    logger.error('Path traversal attempt detected', {
      userId,
      attachmentId,
      filePath: attachment.file_path,
      resolvedPath
    });
    throw new ForbiddenError('Access denied');
  }

  // Verify the path matches expected structure: uploads/workspaceId/channelId/messageId/filename
  const expectedPathPattern = path.join(uploadsDir, workspaceId, channelId, messageId);
  if (!resolvedPath.startsWith(expectedPathPattern)) {
    logger.error('File path does not match expected structure', {
      userId,
      attachmentId,
      resolvedPath,
      expectedPattern: expectedPathPattern
    });
    throw new ForbiddenError('Access denied');
  }

  // Check if file exists
  try {
    await fs.access(resolvedPath);
  } catch {
    throw new NotFoundError('File not found on server');
  }

  // Sanitize filename for Content-Disposition header to prevent header injection
  const sanitizedFilename = attachment.original_filename.replace(/[^\w\s.-]/g, '_');

  // Serve file
  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(resolvedPath);
};

export const pinMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  // Get message details
  const messageResult = await pool.query(
    'SELECT channel_id, dm_group_id FROM messages WHERE id = $1',
    [messageId]
  );

  if (messageResult.rows.length === 0) {
    throw new NotFoundError('Message not found');
  }

  const message = messageResult.rows[0];

  // Verify user has permission to pin
  if (message.channel_id) {
    // Channel message - check if user is admin or owner
    const memberResult = await pool.query(
      'SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [message.channel_id, userId]
    );

    if (memberResult.rows.length === 0) {
      throw new ForbiddenError('Not a member of this channel');
    }

    const role = memberResult.rows[0].role;
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenError('Only channel admins and owners can pin messages');
    }
  } else if (message.dm_group_id) {
    // DM message - check if user is member
    const memberResult = await pool.query(
      'SELECT id FROM dm_group_members WHERE dm_group_id = $1 AND user_id = $2',
      [message.dm_group_id, userId]
    );

    if (memberResult.rows.length === 0) {
      throw new ForbiddenError('Not a member of this DM');
    }
  }

  // Pin the message
  try {
    const result = await pool.query(
      `INSERT INTO pinned_messages (message_id, channel_id, dm_group_id, pinned_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, message_id, channel_id, dm_group_id, pinned_by, pinned_at`,
      [messageId, message.channel_id, message.dm_group_id, userId]
    );

    const pinnedMessage = result.rows[0];

    // Emit WebSocket event
    const roomId = message.channel_id || message.dm_group_id;
    io.to(roomId).emit('message-pinned', {
      messageId,
      pinnedBy: userId,
      pinnedAt: pinnedMessage.pinned_at,
    });

    logger.info(`Message ${messageId} pinned by user ${userId}`);

    res.status(201).json(pinnedMessage);
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new BadRequestError('Message is already pinned');
    }
    throw error;
  }
};

export const unpinMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  // Get pinned message details
  const pinnedResult = await pool.query(
    `SELECT pm.id, pm.channel_id, pm.dm_group_id, m.id as message_id
     FROM pinned_messages pm
     JOIN messages m ON pm.message_id = m.id
     WHERE pm.message_id = $1`,
    [messageId]
  );

  if (pinnedResult.rows.length === 0) {
    throw new NotFoundError('Pinned message not found');
  }

  const pinned = pinnedResult.rows[0];

  // Verify user has permission to unpin
  if (pinned.channel_id) {
    const memberResult = await pool.query(
      'SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [pinned.channel_id, userId]
    );

    if (memberResult.rows.length === 0) {
      throw new ForbiddenError('Not a member of this channel');
    }

    const role = memberResult.rows[0].role;
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenError('Only channel admins and owners can unpin messages');
    }
  } else if (pinned.dm_group_id) {
    const memberResult = await pool.query(
      'SELECT id FROM dm_group_members WHERE dm_group_id = $1 AND user_id = $2',
      [pinned.dm_group_id, userId]
    );

    if (memberResult.rows.length === 0) {
      throw new ForbiddenError('Not a member of this DM');
    }
  }

  // Unpin the message
  await pool.query('DELETE FROM pinned_messages WHERE message_id = $1', [messageId]);

  // Emit WebSocket event
  const roomId = pinned.channel_id || pinned.dm_group_id;
  io.to(roomId).emit('message-unpinned', { messageId });

  logger.info(`Message ${messageId} unpinned by user ${userId}`);

  res.status(204).send();
};

export const getPinnedMessages = async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const userId = req.userId!;

  // Verify user is member of channel
  const memberResult = await pool.query(
    'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
    [channelId, userId]
  );

  if (memberResult.rows.length === 0) {
    throw new ForbiddenError('Not a member of this channel');
  }

  // Get pinned messages with full message data
  const result = await pool.query(
    `SELECT
      pm.id as pin_id,
      pm.pinned_by,
      pm.pinned_at,
      m.id,
      m.workspace_id,
      m.channel_id,
      m.user_id,
      m.content,
      m.message_type,
      m.metadata,
      m.parent_message_id,
      m.is_edited,
      m.is_deleted,
      m.reply_count,
      m.last_reply_at,
      m.created_at,
      m.updated_at,
      u.username,
      u.display_name,
      u.avatar_url,
      pinner.username as pinned_by_username,
      pinner.display_name as pinned_by_display_name
    FROM pinned_messages pm
    JOIN messages m ON pm.message_id = m.id
    JOIN users u ON m.user_id = u.id
    JOIN users pinner ON pm.pinned_by = pinner.id
    WHERE pm.channel_id = $1
    ORDER BY pm.pinned_at DESC`,
    [channelId]
  );

  const pinnedMessages = result.rows.map((row) => ({
    ...row,
    user: {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: getFullAvatarUrl(row.avatar_url),
    },
    pinnedBy: {
      id: row.pinned_by,
      username: row.pinned_by_username,
      displayName: row.pinned_by_display_name,
    },
  }));

  res.json({ pinnedMessages });
};

export const bookmarkMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;
  const { note } = req.body;

  // Get message details
  const messageResult = await pool.query(
    'SELECT channel_id, dm_group_id FROM messages WHERE id = $1',
    [messageId]
  );

  if (messageResult.rows.length === 0) {
    throw new NotFoundError('Message not found');
  }

  const message = messageResult.rows[0];

  // Verify user has access to the message
  if (message.channel_id) {
    const memberResult = await pool.query(
      'SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [message.channel_id, userId]
    );

    if (memberResult.rows.length === 0) {
      throw new ForbiddenError('Not a member of this channel');
    }
  } else if (message.dm_group_id) {
    const memberResult = await pool.query(
      'SELECT id FROM dm_group_members WHERE dm_group_id = $1 AND user_id = $2',
      [message.dm_group_id, userId]
    );

    if (memberResult.rows.length === 0) {
      throw new ForbiddenError('Not a member of this DM');
    }
  }

  // Bookmark the message
  try {
    const result = await pool.query(
      `INSERT INTO bookmarked_messages (user_id, message_id, channel_id, dm_group_id, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, message_id, channel_id, dm_group_id, note, bookmarked_at`,
      [userId, messageId, message.channel_id, message.dm_group_id, note || null]
    );

    logger.info(`Message ${messageId} bookmarked by user ${userId}`);

    res.status(201).json({
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      messageId: result.rows[0].message_id,
      channelId: result.rows[0].channel_id,
      dmGroupId: result.rows[0].dm_group_id,
      note: result.rows[0].note,
      bookmarkedAt: result.rows[0].bookmarked_at,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      throw new BadRequestError('Message is already bookmarked');
    }
    throw error;
  }
};

export const unbookmarkMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const userId = req.userId!;

  await pool.query(
    'DELETE FROM bookmarked_messages WHERE message_id = $1 AND user_id = $2',
    [messageId, userId]
  );

  logger.info(`Message ${messageId} unbookmarked by user ${userId}`);

  res.status(204).send();
};

export const getBookmarkedMessages = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Get bookmarked messages with full message data
  const result = await pool.query(
    `SELECT
      bm.id as bookmark_id,
      bm.note,
      bm.bookmarked_at,
      m.id,
      m.workspace_id,
      m.channel_id,
      m.dm_group_id,
      m.user_id,
      m.content,
      m.message_type,
      m.metadata,
      m.parent_message_id,
      m.is_edited,
      m.is_deleted,
      m.reply_count,
      m.last_reply_at,
      m.created_at,
      m.updated_at,
      u.username,
      u.display_name,
      u.avatar_url,
      c.name as channel_name,
      c.is_private as channel_is_private
    FROM bookmarked_messages bm
    JOIN messages m ON bm.message_id = m.id
    JOIN users u ON m.user_id = u.id
    LEFT JOIN channels c ON m.channel_id = c.id
    WHERE bm.user_id = $1 AND m.workspace_id = $2
    ORDER BY bm.bookmarked_at DESC`,
    [userId, workspaceId]
  );

  const bookmarkedMessages = result.rows.map((row) => ({
    bookmarkId: row.bookmark_id,
    note: row.note,
    bookmarkedAt: row.bookmarked_at,
    message: {
      id: row.id,
      workspaceId: row.workspace_id,
      channelId: row.channel_id,
      dmGroupId: row.dm_group_id,
      userId: row.user_id,
      content: row.content,
      messageType: row.message_type,
      metadata: row.metadata,
      parentMessageId: row.parent_message_id,
      isEdited: row.is_edited,
      isDeleted: row.is_deleted,
      replyCount: row.reply_count,
      lastReplyAt: row.last_reply_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: getFullAvatarUrl(row.avatar_url),
      },
      channelName: row.channel_name,
      channelIsPrivate: row.channel_is_private,
    },
  }));

  res.json({ bookmarkedMessages });
};