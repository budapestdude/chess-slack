import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply auth per-route instead of globally to avoid blocking other routers
router.post('/', authenticateToken, workspaceController.createWorkspace);
router.get('/', authenticateToken, workspaceController.getWorkspaces);
router.get('/:workspaceId', authenticateToken, workspaceController.getWorkspace);
router.put('/:workspaceId', authenticateToken, workspaceController.updateWorkspace);
router.delete('/:workspaceId', authenticateToken, workspaceController.deleteWorkspace);
router.get('/:workspaceId/members', authenticateToken, workspaceController.getWorkspaceMembers);

export default router;