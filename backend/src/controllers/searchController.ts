import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';

interface SearchResults {
  messages: unknown[];
  channels: unknown[];
  users: unknown[];
}

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  workspaceId: z.string().uuid(),
  limit: z.number().int().positive().max(50).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
  type: z.enum(['messages', 'channels', 'users', 'all']).optional().default('all'),
  // Advanced filters
  fromUser: z.string().uuid().optional(),
  inChannel: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  hasAttachment: z.boolean().optional(),
});

const savedSearchSchema = z.object({
  name: z.string().min(1).max(255),
  query: z.string().min(1).max(200),
  filters: z.object({
    fromUser: z.string().uuid().optional(),
    inChannel: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    hasAttachment: z.boolean().optional(),
    type: z.enum(['messages', 'channels', 'users', 'all']).optional(),
  }).optional(),
});

export const search = async (req: AuthRequest, res: Response) => {
  try {
    const { query, workspaceId, limit, offset, type, fromUser, inChannel, dateFrom, dateTo, hasAttachment } = searchSchema.parse({
      ...req.query,
      workspaceId: req.params.workspaceId,
      hasAttachment: req.query.hasAttachment === 'true',
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

    // Save to search history
    try {
      await pool.query(
        `INSERT INTO search_history (user_id, workspace_id, query, result_count)
         VALUES ($1, $2, $3, 0)`,
        [userId, workspaceId, query]
      );
    } catch (err) {
      // Non-critical, continue - do not throw, just log and continue
    }

    const results: SearchResults = {
      messages: [],
      channels: [],
      users: [],
    };

    // Search messages
    if (type === 'messages' || type === 'all') {
      let messageQuery = `
        SELECT m.id, m.content, m.channel_id, m.created_at,
                c.name as channel_name,
                u.id as user_id, u.username, u.display_name, u.avatar_url,
                (SELECT COUNT(*) FROM attachments WHERE message_id = m.id) as attachment_count,
                ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) as rank
         FROM messages m
         JOIN users u ON m.user_id = u.id
         LEFT JOIN channels c ON m.channel_id = c.id
         LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
         WHERE m.workspace_id = $3
           AND m.is_deleted = false
           AND (c.id IS NULL OR cm.user_id IS NOT NULL OR c.is_private = false)
           AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)`;

      const params: (string | Date | number)[] = [query, userId, workspaceId];
      let paramCount = 3;

      // Apply filters
      if (fromUser) {
        paramCount++;
        messageQuery += ` AND m.user_id = $${paramCount}`;
        params.push(fromUser);
      }

      if (inChannel) {
        paramCount++;
        messageQuery += ` AND m.channel_id = $${paramCount}`;
        params.push(inChannel);
      }

      if (dateFrom) {
        paramCount++;
        messageQuery += ` AND m.created_at >= $${paramCount}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        paramCount++;
        messageQuery += ` AND m.created_at <= $${paramCount}`;
        params.push(dateTo);
      }

      if (hasAttachment) {
        messageQuery += ` AND EXISTS (SELECT 1 FROM attachments WHERE message_id = m.id)`;
      }

      messageQuery += ` ORDER BY rank DESC, m.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const messagesResult = await pool.query(messageQuery, params);

      results.messages = messagesResult.rows.map((row) => ({
        id: row.id,
        content: row.content,
        channelId: row.channel_id,
        channelName: row.channel_name,
        createdAt: row.created_at,
        hasAttachment: row.attachment_count > 0,
        user: {
          id: row.user_id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
        },
        relevance: parseFloat(row.rank),
      }));

      // Update search history with result count
      try {
        await pool.query(
          `UPDATE search_history
           SET result_count = $1
           WHERE user_id = $2 AND workspace_id = $3 AND query = $4
           AND searched_at = (
             SELECT MAX(searched_at)
             FROM search_history
             WHERE user_id = $2 AND workspace_id = $3 AND query = $4
           )`,
          [messagesResult.rows.length, userId, workspaceId, query]
        );
      } catch (err) {
        console.error('Failed to update search history:', err);
      }
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

export const createSavedSearch = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { name, query, filters } = savedSearchSchema.parse(req.body);
  const userId = req.userId!;

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const result = await pool.query(
    `INSERT INTO saved_searches (user_id, workspace_id, name, query, filters)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, workspace_id, name, query, filters, created_at, updated_at`,
    [userId, workspaceId, name, query, JSON.stringify(filters || {})]
  );

  const savedSearch = result.rows[0];

  res.status(201).json({
    id: savedSearch.id,
    userId: savedSearch.user_id,
    workspaceId: savedSearch.workspace_id,
    name: savedSearch.name,
    query: savedSearch.query,
    filters: savedSearch.filters,
    createdAt: savedSearch.created_at,
    updatedAt: savedSearch.updated_at,
  });
};

export const getSavedSearches = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  const result = await pool.query(
    `SELECT id, user_id, workspace_id, name, query, filters, created_at, updated_at
     FROM saved_searches
     WHERE user_id = $1 AND workspace_id = $2
     ORDER BY created_at DESC`,
    [userId, workspaceId]
  );

  const savedSearches = result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    name: row.name,
    query: row.query,
    filters: row.filters,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({ savedSearches });
};

export const deleteSavedSearch = async (req: AuthRequest, res: Response) => {
  const { workspaceId, savedSearchId } = req.params;
  const userId = req.userId!;

  const result = await pool.query(
    'DELETE FROM saved_searches WHERE id = $1 AND user_id = $2 AND workspace_id = $3 RETURNING id',
    [savedSearchId, userId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Saved search not found');
  }

  res.json({ message: 'Saved search deleted successfully' });
};

export const getSearchHistory = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await pool.query(
    `SELECT DISTINCT ON (query) query, result_count, searched_at
     FROM search_history
     WHERE user_id = $1 AND workspace_id = $2
     ORDER BY query, searched_at DESC
     LIMIT $3`,
    [userId, workspaceId, limit]
  );

  const searchHistory = result.rows.map(row => ({
    query: row.query,
    resultCount: row.result_count,
    searchedAt: row.searched_at,
  }));

  res.json({ searchHistory });
};