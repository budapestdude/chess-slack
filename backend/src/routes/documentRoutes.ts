import { Router } from 'express';
import * as documentController from '../controllers/documentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/search:
 *   get:
 *     summary: Search documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 */
router.get('/:workspaceId/documents/search', authenticateToken, documentController.searchDocuments);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/favorites:
 *   get:
 *     summary: Get favorite documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of favorite documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 */
router.get('/:workspaceId/documents/favorites', authenticateToken, documentController.getFavorites);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents:
 *   post:
 *     summary: Create a new document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 500
 *               content:
 *                 type: string
 *               contentType:
 *                 type: string
 *                 enum: [markdown, html, rich_text]
 *               docType:
 *                 type: string
 *                 enum: [document, wiki, note, folder]
 *               icon:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               isPublic:
 *                 type: boolean
 *               isTemplate:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *   get:
 *     summary: List workspace documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [document, wiki, note, folder]
 *       - in: query
 *         name: isTemplate
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 */
router.post('/:workspaceId/documents', authenticateToken, documentController.createDocument);
router.get('/:workspaceId/documents', authenticateToken, documentController.getWorkspaceDocuments);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}:
 *   get:
 *     summary: Get a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       404:
 *         description: Document not found
 *   put:
 *     summary: Update a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               icon:
 *                 type: string
 *               coverImageUrl:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Document deleted successfully
 */
router.get('/:workspaceId/documents/:documentId', authenticateToken, documentController.getDocument);
router.put('/:workspaceId/documents/:documentId', authenticateToken, documentController.updateDocument);
router.delete('/:workspaceId/documents/:documentId', authenticateToken, documentController.deleteDocument);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/archive:
 *   post:
 *     summary: Archive a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document archived successfully
 */
router.post('/:workspaceId/documents/:documentId/archive', authenticateToken, documentController.archiveDocument);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/versions:
 *   get:
 *     summary: Get document version history
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Version history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   versionNumber:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   content:
 *                     type: string
 *                   createdBy:
 *                     type: string
 *                     format: uuid
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   changeSummary:
 *                     type: string
 */
router.get('/:workspaceId/documents/:documentId/versions', authenticateToken, documentController.getDocumentVersions);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/versions/restore:
 *   post:
 *     summary: Restore a previous version
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - versionNumber
 *             properties:
 *               versionNumber:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Version restored successfully
 */
router.post('/:workspaceId/documents/:documentId/versions/restore', authenticateToken, documentController.restoreVersion);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/collaborators:
 *   post:
 *     summary: Add a collaborator to document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - permissionLevel
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               permissionLevel:
 *                 type: string
 *                 enum: [view, comment, edit, admin]
 *     responses:
 *       201:
 *         description: Collaborator added successfully
 */
router.post('/:workspaceId/documents/:documentId/collaborators', authenticateToken, documentController.addCollaborator);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/collaborators/{collaboratorId}:
 *   put:
 *     summary: Update collaborator permission
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: collaboratorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionLevel
 *             properties:
 *               permissionLevel:
 *                 type: string
 *                 enum: [view, comment, edit, admin]
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *   delete:
 *     summary: Remove collaborator
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: collaboratorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Collaborator removed successfully
 */
router.put('/:workspaceId/documents/:documentId/collaborators/:collaboratorId', authenticateToken, documentController.updateCollaboratorPermission);
router.delete('/:workspaceId/documents/:documentId/collaborators/:collaboratorId', authenticateToken, documentController.removeCollaborator);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/comments:
 *   post:
 *     summary: Add a comment to document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               parentCommentId:
 *                 type: string
 *                 format: uuid
 *               selectionStart:
 *                 type: integer
 *               selectionEnd:
 *                 type: integer
 *               selectionText:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *   get:
 *     summary: Get document comments
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
router.post('/:workspaceId/documents/:documentId/comments', authenticateToken, documentController.addComment);
router.get('/:workspaceId/documents/:documentId/comments', authenticateToken, documentController.getComments);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/comments/{commentId}:
 *   put:
 *     summary: Update a comment
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *   delete:
 *     summary: Delete a comment
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Comment deleted successfully
 */
router.put('/:workspaceId/documents/:documentId/comments/:commentId', authenticateToken, documentController.updateComment);
router.delete('/:workspaceId/documents/:documentId/comments/:commentId', authenticateToken, documentController.deleteComment);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/comments/{commentId}/resolve:
 *   post:
 *     summary: Resolve or unresolve a comment
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comment resolution toggled
 */
router.post('/:workspaceId/documents/:documentId/comments/:commentId/resolve', authenticateToken, documentController.resolveComment);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/documents/{documentId}/favorite:
 *   post:
 *     summary: Toggle document favorite status
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Favorite status toggled
 */
router.post('/:workspaceId/documents/:documentId/favorite', authenticateToken, documentController.toggleFavorite);

export default router;

