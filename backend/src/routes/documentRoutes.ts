import { Router } from 'express';
import * as documentController from '../controllers/documentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Document search (must come before :documentId routes)
router.get('/:workspaceId/documents/search', authenticateToken, documentController.searchDocuments);

// Document favorites
router.get('/:workspaceId/documents/favorites', authenticateToken, documentController.getFavorites);

// Document management
router.post('/:workspaceId/documents', authenticateToken, documentController.createDocument);
router.get('/:workspaceId/documents', authenticateToken, documentController.getWorkspaceDocuments);
router.get('/:workspaceId/documents/:documentId', authenticateToken, documentController.getDocument);
router.put('/:workspaceId/documents/:documentId', authenticateToken, documentController.updateDocument);
router.delete('/:workspaceId/documents/:documentId', authenticateToken, documentController.deleteDocument);
router.post('/:workspaceId/documents/:documentId/archive', authenticateToken, documentController.archiveDocument);

// Document versioning
router.get('/:workspaceId/documents/:documentId/versions', authenticateToken, documentController.getDocumentVersions);
router.post('/:workspaceId/documents/:documentId/versions/restore', authenticateToken, documentController.restoreVersion);

// Document collaborators
router.post('/:workspaceId/documents/:documentId/collaborators', authenticateToken, documentController.addCollaborator);
router.put('/:workspaceId/documents/:documentId/collaborators/:collaboratorId', authenticateToken, documentController.updateCollaboratorPermission);
router.delete('/:workspaceId/documents/:documentId/collaborators/:collaboratorId', authenticateToken, documentController.removeCollaborator);

// Document comments
router.post('/:workspaceId/documents/:documentId/comments', authenticateToken, documentController.addComment);
router.get('/:workspaceId/documents/:documentId/comments', authenticateToken, documentController.getComments);
router.put('/:workspaceId/documents/:documentId/comments/:commentId', authenticateToken, documentController.updateComment);
router.delete('/:workspaceId/documents/:documentId/comments/:commentId', authenticateToken, documentController.deleteComment);
router.post('/:workspaceId/documents/:documentId/comments/:commentId/resolve', authenticateToken, documentController.resolveComment);

// Document favorites
router.post('/:workspaceId/documents/:documentId/favorite', authenticateToken, documentController.toggleFavorite);

export default router;
