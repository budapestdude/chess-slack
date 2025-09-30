import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  workspaceId: z.string().uuid(),
  limit: z.number().int().positive().max(50).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
  type: z.enum(['messages', 'channels', 'users', 'all']).optional().default('all'),
});

export const search = async (req: AuthRequest, res: Response) => {
  try {
    const { query, workspaceId, limit, offset, type } = searchSchema.parse({
      ...req.query,
      workspaceId: req.params.workspaceId,
    });

    const userId = req.userId!;

    // Verify user is member of workspace
    const memberCheck = await pool.query(
      'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    const results: any = {
      messages: [],
      channels: [],
      users: [],
    };

    // Search messages
    if (type === 'messages' || type === 'all') {
      const messagesResult = await pool.query(
        `SELECT m.id, m.content, m.channel_id, m.created_at,
                c.name as channel_name,
                u.id as user_id, u.username, u.display_name, u.avatar_url,
                ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) as rank
         FROM messages m
         JOIN users u ON m.user_id = u.id
         LEFT JOIN channels c ON m.channel_id = c.id
         LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
         WHERE m.workspace_id = $3
           AND m.is_deleted = false
           AND (c.id IS NULL OR cm.user_id IS NOT NULL OR c.is_private = false)
           AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC, m.created_at DESC
         LIMIT $4 OFFSET $5`,
        [query, userId, workspaceId, limit, offset]
      );

      results.messages = messagesResult.rows.map((row) => ({
        id: row.id,
        content: row.content,
        channelId: row.channel_id,
        channelName: row.channel_name,
        createdAt: row.created_at,
        user: {
          id: row.user_id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
        },
        relevance: parseFloat(row.rank),
      }));
    }

    // Search channels
    if (type === 'channels' || type === 'all') {
      const channelsResult = await pool.query(
        `SELECT c.id, c.name, c.description, c.topic, c.is_private, c.created_at,
                COALESCE(cm.user_id, 0) as is_member,
                ts_rank(
                  to_tsvector('english', c.name || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(c.topic, '')),
                  plainto_tsquery('english', $1)
                ) as rank
         FROM channels c
         LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
         WHERE c.workspace_id = $3
           AND c.is_archived = false
           AND (c.is_private = false OR cm.user_id IS NOT NULL)
           AND to_tsvector('english', c.name || ' ' || COALESCE(c.description, '') || ' ' || COALESCE(c.topic, ''))
               @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $4 OFFSET $5`,
        [query, userId, workspaceId, Math.min(limit, 10), 0]
      );

      results.channels = channelsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        topic: row.topic,
        isPrivate: row.is_private,
        isMember: row.is_member !== 0,
        createdAt: row.created_at,
        relevance: parseFloat(row.rank),
      }));
    }

    // Search users in workspace
    if (type === 'users' || type === 'all') {
      const usersResult = await pool.query(
        `SELECT u.id, u.username, u.display_name, u.avatar_url, u.status,
                ts_rank(
                  to_tsvector('english', u.username || ' ' || u.display_name),
                  plainto_tsquery('english', $1)
                ) as rank
         FROM users u
         JOIN workspace_members wm ON u.id = wm.user_id
         WHERE wm.workspace_id = $2
           AND u.is_active = true
           AND to_tsvector('english', u.username || ' ' || u.display_name)
               @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $3 OFFSET $4`,
        [query, workspaceId, Math.min(limit, 10), 0]
      );

      results.users = usersResult.rows.map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        status: row.status,
        relevance: parseFloat(row.rank),
      }));
    }

    res.json({
      query,
      results,
      totalResults: results.messages.length + results.channels.length + results.users.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid search parameters', details: error.errors });
    }
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
};

export const searchMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    const { workspaceId, channelId } = req.params;
    const userId = req.userId!;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Verify user is member of channel
    const memberCheck = await pool.query(
      `SELECT cm.id
       FROM channel_members cm
       JOIN channels c ON cm.channel_id = c.id
       WHERE c.id = $1 AND c.workspace_id = $2 AND cm.user_id = $3`,
      [channelId, workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    const result = await pool.query(
      `SELECT m.id, m.content, m.created_at, m.is_edited,
              u.id as user_id, u.username, u.display_name, u.avatar_url,
              ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) as rank
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = $2
         AND m.is_deleted = false
         AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC, m.created_at DESC
       LIMIT 50`,
      [query.trim(), channelId]
    );

    const messages = result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      isEdited: row.is_edited,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
      relevance: parseFloat(row.rank),
    }));

    res.json({ query, messages, totalResults: messages.length });
  } catch (error) {
    console.error('Message search error:', error);
    return res.status(500).json({ error: 'Message search failed' });
  }
};