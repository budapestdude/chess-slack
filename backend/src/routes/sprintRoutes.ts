import { Router } from 'express';
import * as sprintController from '../controllers/sprintController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Sprint routes
router.get('/:workspaceId/sprints', authenticateToken, sprintController.getSprints);
router.get('/:workspaceId/sprints/:sprintId', authenticateToken, sprintController.getSprint);
router.post('/:workspaceId/sprints', authenticateToken, sprintController.createSprint);
router.put('/:workspaceId/sprints/:sprintId', authenticateToken, sprintController.updateSprint);
router.delete('/:workspaceId/sprints/:sprintId', authenticateToken, sprintController.deleteSprint);

// Task routes
router.get('/:workspaceId/sprints/:sprintId/tasks', authenticateToken, sprintController.getTasks);
router.get('/:workspaceId/sprints/:sprintId/tasks/:taskId', authenticateToken, sprintController.getTask);
router.post('/:workspaceId/sprints/:sprintId/tasks', authenticateToken, sprintController.createTask);
router.put('/:workspaceId/sprints/:sprintId/tasks/:taskId', authenticateToken, sprintController.updateTask);
router.delete('/:workspaceId/sprints/:sprintId/tasks/:taskId', authenticateToken, sprintController.deleteTask);

// Metrics routes
router.get('/:workspaceId/sprints/:sprintId/metrics', authenticateToken, sprintController.getMetrics);
router.post('/:workspaceId/sprints/:sprintId/metrics', authenticateToken, sprintController.updateMetrics);

export default router;
