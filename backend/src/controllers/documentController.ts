import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import documentService from '../services/documentService';
import {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PermissionLevel,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '../types/document';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  contentType: z.string().max(50).optional().default('markdown'),
  docType: z.enum(['document', 'wiki', 'note', 'folder']).optional().default('document'),
  parentId: z.string().uuid().optional(),
  icon: z.string().max(50).optional(),
  coverImageUrl: z.string().url().optional(),
  isPublic: z.boolean().optional().default(false),
  isTemplate: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional(),
  collaborators: z.array(z.object({
    userId: z.string().uuid(),
    permissionLevel: z.enum(['view', 'comment', 'edit', 'admin']).optional().default('view'),
  })).optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  contentType: z.string().max(50).optional(),
  docType: z.enum(['document', 'wiki', 'note', 'folder']).optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().max(50).optional(),
  coverImageUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

const getDocumentsQuerySchema = z.object({
  docType: z.enum(['document', 'wiki', 'note', 'folder']).optional(),
  parentId: z.string().uuid().optional(),
  includeArchived: z.string().transform(val => val === 'true').optional(),
});

const searchDocumentsQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
});

const addCollaboratorSchema = z.object({
  userId: z.string().uuid(),
  permissionLevel: z.enum(['view', 'comment', 'edit', 'admin']).optional().default('view'),
});

const updateCollaboratorSchema = z.object({
  permissionLevel: z.enum(['view', 'comment', 'edit', 'admin']),
});

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentCommentId: z.string().uuid().optional(),
  selectionStart: z.number().int().nonnegative().optional(),
  selectionEnd: z.number().int().nonnegative().optional(),
  selectionText: z.string().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1),
});

const restoreVersionSchema = z.object({
  versionNumber: z.number().int().positive(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
  logger.info('Checking workspace membership', { workspaceId, userId });

  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  logger.info('Membership check result', {
    workspaceId,
    userId,
    isMember: memberCheck.rows.length > 0
  });

  if (memberCheck.rows.length === 0) {
    logger.warn('User not a member of workspace', { workspaceId, userId });
    throw new ForbiddenError('Not a member of this workspace');
  }
}

async function checkDocumentAccess(
  workspaceId: string,
  documentId: string,
  userId: string
): Promise<void> {
  await checkWorkspaceMembership(workspaceId, userId);

  const document = await documentService.getDocument(documentId);
  if (!document) {
    throw new NotFoundError('Document not found');
  }

  if (document.workspaceId !== workspaceId) {
    throw new ForbiddenError('Document does not belong to this workspace');
  }

  const canView = await documentService.canView(documentId, userId);
  if (!canView) {
    throw new NotFoundError('Document not found');
  }
}

// ============================================
// DOCUMENT CONTROLLERS
// ============================================

/**
 * POST /api/workspaces/:workspaceId/documents
 * Create a new document
 */
export const createDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate request body
  const data = createDocumentSchema.parse(req.body);

  // If parentId is provided, verify it exists and user has access
  if (data.parentId) {
    const canView = await documentService.canView(data.parentId, userId);
    if (!canView) {
      throw new BadRequestError('Invalid parent document');
    }
  }

  // Create document request
  const createRequest: CreateDocumentRequest = {
    title: data.title,
    content: data.content,
    contentType: data.contentType,
    docType: data.docType,
    parentId: data.parentId,
    icon: data.icon,
    coverImageUrl: data.coverImageUrl,
    isPublic: data.isPublic,
    isTemplate: data.isTemplate,
    metadata: data.metadata,
    collaborators: data.collaborators as Array<{ userId: string; permissionLevel: PermissionLevel }>,
  };

  // Create document
  const document = await documentService.createDocument(workspaceId, createRequest, userId);

  // Fetch with permissions to include user's permission level
  const documentWithPermissions = await documentService.getDocumentWithPermissions(document.id, userId);

  logger.info('Document created via API', { documentId: document.id, workspaceId, userId });

  res.status(201).json(documentWithPermissions);
});

/**
 * GET /api/workspaces/:workspaceId/documents/:documentId
 * Get document details
 */
export const getDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Get document with permissions
  const docWithPermissions = await documentService.getDocumentWithPermissions(documentId, userId);

  if (!docWithPermissions) {
    throw new NotFoundError('Document not found');
  }

  // Get collaborators
  const collaborators = await documentService.getCollaborators(documentId);

  // Check if favorited
  const isFavorited = await documentService.isFavorited(documentId, userId);

  // Record view
  await documentService.recordView(documentId, userId);

  res.json({
    ...docWithPermissions.document,
    permissions: {
      level: docWithPermissions.permissionLevel,
      canView: docWithPermissions.canView,
      canComment: docWithPermissions.canComment,
      canEdit: docWithPermissions.canEdit,
      canAdmin: docWithPermissions.canAdmin,
    },
    collaborators,
    isFavorited,
  });
});

/**
 * GET /api/workspaces/:workspaceId/documents
 * Get all documents in workspace
 */
export const getWorkspaceDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  logger.info('getWorkspaceDocuments called', { workspaceId, userId, query: req.query });

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getDocumentsQuerySchema.parse(req.query);

  // Get documents
  const documents = await documentService.getWorkspaceDocuments(workspaceId, userId, {
    docType: query.docType,
    parentId: query.parentId,
    includeArchived: query.includeArchived,
  });

  res.json({ documents });
});

/**
 * PUT /api/workspaces/:workspaceId/documents/:documentId
 * Update a document
 */
export const updateDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user can edit
  const canEdit = await documentService.canEdit(documentId, userId);
  if (!canEdit) {
    throw new ForbiddenError('You do not have permission to edit this document');
  }

  // Validate request body
  const updates = updateDocumentSchema.parse(req.body);

  // If parentId is being changed, verify new parent exists and user has access
  if (updates.parentId !== undefined && updates.parentId !== null) {
    const canView = await documentService.canView(updates.parentId, userId);
    if (!canView) {
      throw new BadRequestError('Invalid parent document');
    }
  }

  // Update document request (convert null parentId to undefined for type safety)
  const updateRequest: UpdateDocumentRequest = {
    ...updates,
    parentId: updates.parentId === null ? undefined : updates.parentId,
  };

  // Update document
  const updatedDocument = await documentService.updateDocument(documentId, updateRequest, userId);

  // Fetch with permissions to include user's permission level
  const documentWithPermissions = await documentService.getDocumentWithPermissions(documentId, userId);

  logger.info('Document updated via API', { documentId, workspaceId, userId });

  res.json(documentWithPermissions);
});

/**
 * DELETE /api/workspaces/:workspaceId/documents/:documentId
 * Delete a document
 */
export const deleteDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user is admin
  const isAdmin = await documentService.isAdmin(documentId, userId);
  if (!isAdmin) {
    throw new ForbiddenError('You do not have permission to delete this document');
  }

  // Delete document
  await documentService.deleteDocument(documentId);

  logger.info('Document deleted via API', { documentId, workspaceId, userId });

  res.json({ message: 'Document deleted successfully' });
});

/**
 * POST /api/workspaces/:workspaceId/documents/:documentId/archive
 * Archive a document
 */
export const archiveDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user can edit
  const canEdit = await documentService.canEdit(documentId, userId);
  if (!canEdit) {
    throw new ForbiddenError('You do not have permission to archive this document');
  }

  // Archive document
  await documentService.archiveDocument(documentId);

  logger.info('Document archived via API', { documentId, workspaceId, userId });

  res.json({ message: 'Document archived successfully' });
});

/**
 * GET /api/workspaces/:workspaceId/documents/search
 * Search documents
 */
export const searchDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const queryParams = searchDocumentsQuerySchema.parse(req.query);

  // Search documents
  const results = await documentService.searchDocuments(
    workspaceId,
    queryParams.query,
    queryParams.limit || 50
  );

  res.json({ results });
});

// ============================================
// VERSION CONTROLLERS
// ============================================

/**
 * GET /api/workspaces/:workspaceId/documents/:documentId/versions
 * Get document version history
 */
export const getDocumentVersions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Get versions
  const versions = await documentService.getVersions(documentId);

  res.json({ versions });
});

/**
 * POST /api/workspaces/:workspaceId/documents/:documentId/versions/restore
 * Restore a document version
 */
export const restoreVersion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user can edit
  const canEdit = await documentService.canEdit(documentId, userId);
  if (!canEdit) {
    throw new ForbiddenError('You do not have permission to restore versions');
  }

  // Validate request body
  const { versionNumber } = restoreVersionSchema.parse(req.body);

  // Restore version
  const document = await documentService.restoreVersion(documentId, versionNumber, userId);

  logger.info('Document version restored via API', { documentId, versionNumber, workspaceId, userId });

  res.json(document);
});

// ============================================
// COLLABORATOR CONTROLLERS
// ============================================

/**
 * POST /api/workspaces/:workspaceId/documents/:documentId/collaborators
 * Add a collaborator to a document
 */
export const addCollaborator = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user is admin
  const isAdmin = await documentService.isAdmin(documentId, userId);
  if (!isAdmin) {
    throw new ForbiddenError('Only admins can add collaborators');
  }

  // Validate request body
  const { userId: collaboratorUserId, permissionLevel } = addCollaboratorSchema.parse(req.body);

  // Verify the user to be added is a workspace member
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, collaboratorUserId]
  );

  if (memberCheck.rows.length === 0) {
    throw new BadRequestError('User is not a member of this workspace');
  }

  // Add collaborator
  const collaborator = await documentService.addCollaborator(
    documentId,
    collaboratorUserId,
    permissionLevel as PermissionLevel,
    userId
  );

  logger.info('Collaborator added via API', { documentId, collaboratorUserId, workspaceId, userId });

  res.status(201).json(collaborator);
});

/**
 * PUT /api/workspaces/:workspaceId/documents/:documentId/collaborators/:collaboratorId
 * Update collaborator permission
 */
export const updateCollaboratorPermission = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId, collaboratorId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user is admin
  const isAdmin = await documentService.isAdmin(documentId, userId);
  if (!isAdmin) {
    throw new ForbiddenError('Only admins can update collaborator permissions');
  }

  // Validate request body
  const { permissionLevel } = updateCollaboratorSchema.parse(req.body);

  // Update collaborator permission
  const collaborator = await documentService.updateCollaboratorPermission(
    documentId,
    collaboratorId,
    permissionLevel as PermissionLevel
  );

  logger.info('Collaborator permission updated via API', { documentId, collaboratorId, permissionLevel, workspaceId, userId });

  res.json(collaborator);
});

/**
 * DELETE /api/workspaces/:workspaceId/documents/:documentId/collaborators/:collaboratorId
 * Remove a collaborator from a document
 */
export const removeCollaborator = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId, collaboratorId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user is admin
  const isAdmin = await documentService.isAdmin(documentId, userId);
  if (!isAdmin) {
    throw new ForbiddenError('Only admins can remove collaborators');
  }

  // Remove collaborator
  await documentService.removeCollaborator(documentId, collaboratorId);

  logger.info('Collaborator removed via API', { documentId, collaboratorId, workspaceId, userId });

  res.json({ message: 'Collaborator removed successfully' });
});

// ============================================
// COMMENT CONTROLLERS
// ============================================

/**
 * POST /api/workspaces/:workspaceId/documents/:documentId/comments
 * Add a comment to a document
 */
export const addComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user can comment
  const canComment = await documentService.canComment(documentId, userId);
  if (!canComment) {
    throw new ForbiddenError('You do not have permission to comment on this document');
  }

  // Validate request body
  const data = createCommentSchema.parse(req.body);

  // Create comment request
  const createRequest: CreateCommentRequest = {
    content: data.content!,
    parentCommentId: data.parentCommentId,
    selectionStart: data.selectionStart,
    selectionEnd: data.selectionEnd,
    selectionText: data.selectionText,
  };

  // Add comment
  const comment = await documentService.addComment(documentId, userId, createRequest);

  logger.info('Comment added via API', { documentId, commentId: comment.id, workspaceId, userId });

  res.status(201).json(comment);
});

/**
 * GET /api/workspaces/:workspaceId/documents/:documentId/comments
 * Get all comments for a document
 */
export const getComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Get comments
  const comments = await documentService.getComments(documentId);

  res.json({ comments });
});

/**
 * PUT /api/workspaces/:workspaceId/documents/:documentId/comments/:commentId
 * Update a comment
 */
export const updateComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId, commentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Get comment and check ownership
  const comments = await documentService.getComments(documentId);
  const comment = comments.find(c => c.id === commentId);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  if (comment.userId !== userId) {
    throw new ForbiddenError('You can only edit your own comments');
  }

  // Validate request body
  const updates = updateCommentSchema.parse(req.body);

  // Update comment
  const updatedComment = await documentService.updateComment(commentId, updates as UpdateCommentRequest);

  logger.info('Comment updated via API', { documentId, commentId, workspaceId, userId });

  res.json(updatedComment);
});

/**
 * DELETE /api/workspaces/:workspaceId/documents/:documentId/comments/:commentId
 * Delete a comment
 */
export const deleteComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId, commentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Get comment and check ownership or admin status
  const comments = await documentService.getComments(documentId);
  const comment = comments.find(c => c.id === commentId);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  const isAdmin = await documentService.isAdmin(documentId, userId);
  if (comment.userId !== userId && !isAdmin) {
    throw new ForbiddenError('You can only delete your own comments or be an admin');
  }

  // Delete comment
  await documentService.deleteComment(commentId);

  logger.info('Comment deleted via API', { documentId, commentId, workspaceId, userId });

  res.json({ message: 'Comment deleted successfully' });
});

/**
 * POST /api/workspaces/:workspaceId/documents/:documentId/comments/:commentId/resolve
 * Resolve a comment
 */
export const resolveComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId, commentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if user can comment (same permission level required)
  const canComment = await documentService.canComment(documentId, userId);
  if (!canComment) {
    throw new ForbiddenError('You do not have permission to resolve comments');
  }

  // Resolve comment
  const comment = await documentService.resolveComment(commentId, userId);

  logger.info('Comment resolved via API', { documentId, commentId, workspaceId, userId });

  res.json(comment);
});

// ============================================
// FAVORITE CONTROLLERS
// ============================================

/**
 * POST /api/workspaces/:workspaceId/documents/:documentId/favorite
 * Toggle document favorite status
 */
export const toggleFavorite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, documentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and document access
  await checkDocumentAccess(workspaceId, documentId, userId);

  // Check if already favorited
  const isFavorited = await documentService.isFavorited(documentId, userId);

  if (isFavorited) {
    // Remove from favorites
    await documentService.removeFavorite(documentId, userId);
    logger.info('Document unfavorited via API', { documentId, workspaceId, userId });
    res.json({ favorited: false, message: 'Document removed from favorites' });
  } else {
    // Add to favorites
    await documentService.addFavorite(documentId, userId);
    logger.info('Document favorited via API', { documentId, workspaceId, userId });
    res.json({ favorited: true, message: 'Document added to favorites' });
  }
});

/**
 * GET /api/workspaces/:workspaceId/documents/favorites
 * Get user's favorite documents
 */
export const getFavorites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Get favorites
  const favorites = await documentService.getFavorites(workspaceId, userId);

  res.json({ favorites });
});
