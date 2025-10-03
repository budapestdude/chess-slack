import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../errors';
import logger from '../utils/logger';
import { validateFileType } from '../middleware/upload';
import fs from 'fs';
import path from 'path';

const uploadFileSchema = z.object({
  workspaceId: z.string().uuid(),
  channelId: z.string().uuid().optional(),
  dmGroupId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
});

// Helper function to determine file type category
function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('text')
  ) {
    return 'document';
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('compressed') ||
    mimeType.includes('tar') ||
    mimeType.includes('gzip')
  ) {
    return 'archive';
  }
  return 'other';
}

export const uploadFile = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { workspaceId, channelId, dmGroupId, messageId } = uploadFileSchema.parse({
    workspaceId: req.body.workspaceId || req.params.workspaceId,
    channelId: req.body.channelId,
    dmGroupId: req.body.dmGroupId,
    messageId: req.body.messageId,
  });

  if (!channelId && !dmGroupId) {
    throw new BadRequestError('Either channelId or dmGroupId must be provided');
  }

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Verify user has access to channel or DM group
  if (channelId) {
    const channelCheck = await pool.query(
      `SELECT c.is_private, cm.id as member_id
       FROM channels c
       LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
       WHERE c.id = $1 AND c.workspace_id = $3`,
      [channelId, userId, workspaceId]
    );

    if (channelCheck.rows.length === 0) {
      throw new NotFoundError('Channel not found');
    }

    if (channelCheck.rows[0].is_private && !channelCheck.rows[0].member_id) {
      throw new ForbiddenError('Not a member of this private channel');
    }
  }

  if (dmGroupId) {
    const dmCheck = await pool.query(
      `SELECT 1 FROM dm_group_members WHERE dm_group_id = $1 AND user_id = $2`,
      [dmGroupId, userId]
    );

    if (dmCheck.rows.length === 0) {
      throw new ForbiddenError('Not a member of this DM group');
    }
  }

  // Check if files were uploaded
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new BadRequestError('No files uploaded');
  }

  const uploadedFiles: any[] = [];

  try {
    // Process each file
    for (const file of req.files as Express.Multer.File[]) {
      // Validate file type using magic numbers
      const isValid = await validateFileType(file.path, file.mimetype);
      if (!isValid) {
        // Delete invalid file
        fs.unlinkSync(file.path);
        throw new BadRequestError(`Invalid file type for ${file.originalname}`);
      }

      const fileType = getFileType(file.mimetype);

      // Insert attachment into database
      const result = await pool.query(
        `INSERT INTO attachments (
          message_id, uploader_id, workspace_id, filename, original_filename,
          file_path, file_size, mime_type, file_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, filename, original_filename, file_path, file_size, mime_type, file_type, created_at`,
        [
          messageId || null,
          userId,
          workspaceId,
          file.filename,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          fileType,
        ]
      );

      uploadedFiles.push({
        id: result.rows[0].id,
        filename: result.rows[0].filename,
        originalFilename: result.rows[0].original_filename,
        filePath: result.rows[0].file_path,
        fileSize: result.rows[0].file_size,
        mimeType: result.rows[0].mime_type,
        fileType: result.rows[0].file_type,
        createdAt: result.rows[0].created_at,
      });
    }

    logger.info('Files uploaded', { userId, workspaceId, count: uploadedFiles.length });

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
    });
  } catch (error) {
    // Clean up uploaded files on error
    for (const file of req.files as Express.Multer.File[]) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    throw error;
  }
};

export const getAttachment = async (req: AuthRequest, res: Response) => {
  const { attachmentId } = req.params;
  const userId = req.userId!;

  // Get attachment details
  const attachmentResult = await pool.query(
    `SELECT a.*, m.channel_id, m.dm_group_id
     FROM attachments a
     LEFT JOIN messages m ON a.message_id = m.id
     WHERE a.id = $1`,
    [attachmentId]
  );

  if (attachmentResult.rows.length === 0) {
    throw new NotFoundError('Attachment not found');
  }

  const attachment = attachmentResult.rows[0];

  // Verify user has access
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [attachment.workspace_id, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Access denied');
  }

  // If attached to a channel message, verify channel access
  if (attachment.channel_id) {
    const channelCheck = await pool.query(
      `SELECT c.is_private, cm.id as member_id
       FROM channels c
       LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $2
       WHERE c.id = $1`,
      [attachment.channel_id, userId]
    );

    if (channelCheck.rows.length > 0) {
      if (channelCheck.rows[0].is_private && !channelCheck.rows[0].member_id) {
        throw new ForbiddenError('Access denied');
      }
    }
  }

  // If attached to a DM message, verify DM access
  if (attachment.dm_group_id) {
    const dmCheck = await pool.query(
      `SELECT 1 FROM dm_group_members WHERE dm_group_id = $1 AND user_id = $2`,
      [attachment.dm_group_id, userId]
    );

    if (dmCheck.rows.length === 0) {
      throw new ForbiddenError('Access denied');
    }
  }

  // Send file
  const filePath = path.resolve(attachment.file_path);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('File not found on server');
  }

  res.download(filePath, attachment.original_filename);
};

export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  const { attachmentId } = req.params;
  const userId = req.userId!;

  // Get attachment details
  const attachmentResult = await pool.query(
    `SELECT a.*, m.user_id as message_user_id
     FROM attachments a
     LEFT JOIN messages m ON a.message_id = m.id
     WHERE a.id = $1`,
    [attachmentId]
  );

  if (attachmentResult.rows.length === 0) {
    throw new NotFoundError('Attachment not found');
  }

  const attachment = attachmentResult.rows[0];

  // Only uploader or message author can delete
  if (attachment.uploader_id !== userId && attachment.message_user_id !== userId) {
    throw new ForbiddenError('Only the uploader or message author can delete this attachment');
  }

  // Delete file from disk
  if (fs.existsSync(attachment.file_path)) {
    fs.unlinkSync(attachment.file_path);
  }

  // Delete from database
  await pool.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

  logger.info('Attachment deleted', { attachmentId, userId });

  res.json({ message: 'Attachment deleted successfully' });
};

export const getWorkspaceAttachments = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const { fileType, limit = '50', offset = '0' } = req.query;

  // Verify user is member of workspace
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  let query = `
    SELECT a.id, a.filename, a.original_filename, a.file_size, a.mime_type,
           a.file_type, a.created_at,
           u.id as uploader_id, u.username, u.display_name,
           m.id as message_id, m.content as message_content,
           c.id as channel_id, c.name as channel_name
    FROM attachments a
    JOIN users u ON a.uploader_id = u.id
    LEFT JOIN messages m ON a.message_id = m.id
    LEFT JOIN channels c ON m.channel_id = c.id
    WHERE a.workspace_id = $1
  `;

  const params: any[] = [workspaceId];

  if (fileType) {
    query += ` AND a.file_type = $${params.length + 1}`;
    params.push(fileType);
  }

  query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit as string), parseInt(offset as string));

  const result = await pool.query(query, params);

  const attachments = result.rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    originalFilename: row.original_filename,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    fileType: row.file_type,
    createdAt: row.created_at,
    uploader: {
      id: row.uploader_id,
      username: row.username,
      displayName: row.display_name,
    },
    message: row.message_id
      ? {
          id: row.message_id,
          content: row.message_content,
        }
      : null,
    channel: row.channel_id
      ? {
          id: row.channel_id,
          name: row.channel_name,
        }
      : null,
  }));

  res.json({ attachments });
};
