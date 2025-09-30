import { Response } from 'express';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { io } from '../index';
import notificationService from '../services/notificationService';
import { ForbiddenError } from '../errors';
import logger from '../utils/logger';

export const getOrCreateDM = async (req: AuthRequest, res: Response) => {
  const { workspaceId, userIds } = req.body;
  const userId = req.userId!;

  // Verify user is member of workspace
  const workspaceMember = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (workspaceMember.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Include current user and sort for consistent lookup
  const allUserIds = [...userIds, userId].sort();
  const isGroup = allUserIds.length > 2;

  // Check if DM group already exists
  const existingDM = await pool.query(
    `SELECT dg.id, dg.workspace_id, dg.is_group, dg.created_at
     FROM dm_groups dg
     WHERE dg.workspace_id = $1 AND dg.is_group = $2
     AND (
       SELECT array_agg(dgm.user_id ORDER BY dgm.user_id)
       FROM dm_group_members dgm
       WHERE dgm.dm_group_id = dg.id
     ) = $3`,
    [workspaceId, isGroup, allUserIds]
  );

  if (existingDM.rows.length > 0) {
    const dmGroupId = existingDM.rows[0].id;

    // Fetch members
    const membersResult = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.status
       FROM dm_group_members dgm
       JOIN users u ON dgm.user_id = u.id
       WHERE dgm.dm_group_id = $1`,
      [dmGroupId]
    );

    return res.json({
      id: existingDM.rows[0].id,
      workspaceId: existingDM.rows[0].workspace_id,
      isGroup: existingDM.rows[0].is_group,
      members: membersResult.rows.map(row => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        status: row.status,
      })),
      createdAt: existingDM.rows[0].created_at,
    });
  }

  // Create new DM group
  const newDM = await pool.query(
    'INSERT INTO dm_groups (workspace_id, is_group) VALUES ($1, $2) RETURNING id, workspace_id, is_group, created_at',
    [workspaceId, isGroup]
  );

  const dmGroupId = newDM.rows[0].id;

  // Add members
  for (const uid of allUserIds) {
    await pool.query(
      'INSERT INTO dm_group_members (dm_group_id, user_id) VALUES ($1, $2)',
      [dmGroupId, uid]
    );
  }

  // Fetch members
  const membersResult = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.status
     FROM dm_group_members dgm
     JOIN users u ON dgm.user_id = u.id
     WHERE dgm.dm_group_id = $1`,
    [dmGroupId]
  );

  const dmGroup = {
    id: newDM.rows[0].id,
    workspaceId: newDM.rows[0].workspace_id,
    isGroup: newDM.rows[0].is_group,
    members: membersResult.rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      status: row.status,
    })),
    createdAt: newDM.rows[0].created_at,
  };

  // Broadcast to all members
  allUserIds.forEach(uid => {
    io.in(`user:${uid}`).emit('dm-created', dmGroup);
  });

  res.status(201).json(dmGroup);
};

export const getUserDMs = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId!;

    // Verify user is member of workspace
    const workspaceMember = await pool.query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (workspaceMember.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    const result = await pool.query(
      `SELECT
        dg.id, dg.workspace_id, dg.is_group, dg.created_at,
        json_agg(DISTINCT jsonb_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', u.display_name,
          'avatarUrl', u.avatar_url,
          'status', u.status
        )) as members,
        (SELECT row_to_json(last_msg) FROM (
          SELECT m.id, m.content, m.created_at, m.user_id, mu.username
          FROM messages m
          JOIN users mu ON m.user_id = mu.id
          WHERE m.dm_group_id = dg.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) last_msg) as last_message,
        COALESCE(
          (SELECT COUNT(*)::int FROM messages m
           WHERE m.dm_group_id = dg.id
           AND m.created_at > dgm_current.last_read_at
           AND m.user_id != $2),
          0
        ) as unread_count
      FROM dm_groups dg
      JOIN dm_group_members dgm_current ON dg.id = dgm_current.dm_group_id AND dgm_current.user_id = $2
      JOIN dm_group_members dgm_all ON dg.id = dgm_all.dm_group_id
      JOIN users u ON dgm_all.user_id = u.id
      WHERE dg.workspace_id = $1
      GROUP BY dg.id, dgm_current.last_read_at
      ORDER BY (SELECT MAX(created_at) FROM messages WHERE dm_group_id = dg.id) DESC NULLS LAST`,
      [workspaceId, userId]
    );

    const dms = result.rows.map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      isGroup: row.is_group,
      members: row.members,
      lastMessage: row.last_message,
      unreadCount: row.unread_count,
      createdAt: row.created_at,
    }));

    res.json(dms);
  } catch (error) {
    console.error('Get user DMs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDMMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { dmGroupId } = req.params;
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    // Verify user is member
    const membership = await pool.query(
      'SELECT 1 FROM dm_group_members WHERE dm_group_id = $1 AND user_id = $2',
      [dmGroupId, userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this DM' });
    }

    let query = `
      SELECT m.id, m.workspace_id, m.dm_group_id, m.user_id, m.content, m.message_type,
             m.metadata, m.parent_message_id, m.is_edited, m.is_deleted, m.reply_count,
             m.last_reply_at, m.has_attachments, m.created_at, m.updated_at,
             u.id as user_id, u.username, u.display_name, u.avatar_url,
             (SELECT COUNT(*) FROM messages WHERE parent_message_id = m.id) as reply_count
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.dm_group_id = $1 AND m.parent_message_id IS NULL AND m.is_deleted = false
    `;

    const params: any[] = [dmGroupId];

    if (before) {
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    const messages = result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      dmGroupId: row.dm_group_id,
      userId: row.user_id,
      content: row.content,
      messageType: row.message_type,
      metadata: row.metadata,
      parentMessageId: row.parent_message_id,
      isEdited: row.is_edited,
      isDeleted: row.is_deleted,
      replyCount: parseInt(row.reply_count),
      lastReplyAt: row.last_reply_at,
      hasAttachments: row.has_attachments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
    }));

    // Reverse to show oldest first
    messages.reverse();

    // Update last_read_at
    await pool.query(
      'UPDATE dm_group_members SET last_read_at = NOW() WHERE dm_group_id = $1 AND user_id = $2',
      [dmGroupId, userId]
    );

    res.json({
      messages,
      hasMore: result.rows.length === limit,
    });
  } catch (error) {
    console.error('Get DM messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendDMMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { dmGroupId } = req.params;
    const { content, parentMessageId } = req.body;
    const userId = req.userId!;

    // Verify membership and get workspace_id
    const membership = await pool.query(
      `SELECT dg.workspace_id FROM dm_group_members dgm
       JOIN dm_groups dg ON dgm.dm_group_id = dg.id
       WHERE dgm.dm_group_id = $1 AND dgm.user_id = $2`,
      [dmGroupId, userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this DM' });
    }

    const workspaceId = membership.rows[0].workspace_id;

    // Create message
    const result = await pool.query(
      `INSERT INTO messages (workspace_id, dm_group_id, user_id, content, parent_message_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, workspace_id, dm_group_id, user_id, content, message_type, metadata,
                 parent_message_id, is_edited, is_deleted, reply_count, last_reply_at, has_attachments, created_at, updated_at`,
      [workspaceId, dmGroupId, userId, content, parentMessageId || null]
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
    }

    // Fetch user details
    const userResult = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const messageWithUser = {
      id: message.id,
      workspaceId: message.workspace_id,
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
      hasAttachments: message.has_attachments,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
      user: userResult.rows[0],
    };

    // Broadcast to DM group
    io.in(`dm:${dmGroupId}`).emit('new-message', messageWithUser);

    // Get DM group members for notifications
    const dmMembersResult = await pool.query(
      'SELECT user_id FROM dm_group_members WHERE dm_group_id = $1',
      [dmGroupId]
    );

    const memberIds = dmMembersResult.rows.map(row => row.user_id);

    // Create notifications for mentions
    const mentionedUsernames = notificationService.extractMentionedUsers(content);
    if (mentionedUsernames.length > 0) {
      await notificationService.notifyMentions(
        message.id,
        content,
        mentionedUsernames,
        workspaceId,
        null,
        dmGroupId,
        userId
      );
    }

    // Create DM notifications for non-mentioned recipients
    const recipientIds = memberIds.filter(id => id !== userId && !mentionedUsernames.includes(id));
    if (recipientIds.length > 0) {
      await notificationService.notifyDM(
        message.id,
        content,
        recipientIds,
        workspaceId,
        dmGroupId,
        userId
      );
    }

    res.status(201).json(messageWithUser);
  } catch (error) {
    console.error('Send DM message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};