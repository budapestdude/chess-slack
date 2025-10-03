import { Router } from 'express';
import * as artifactController from '../controllers/artifactController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Artifact management
router.get('/:workspaceId/artifacts', authenticateToken, artifactController.getArtifacts);
router.get('/:workspaceId/artifacts/:artifactId', authenticateToken, artifactController.getArtifact);
router.put('/:workspaceId/artifacts/:artifactId', authenticateToken, artifactController.updateArtifact);
router.delete('/:workspaceId/artifacts/:artifactId', authenticateToken, artifactController.deleteArtifact);

// Code review
router.post('/:workspaceId/artifacts/:artifactId/review', authenticateToken, artifactController.requestReview);
router.get('/:workspaceId/artifacts/:artifactId/reviews', authenticateToken, artifactController.getReviews);
router.post('/:workspaceId/artifacts/:artifactId/reviews', authenticateToken, artifactController.submitReview);

export default router;
