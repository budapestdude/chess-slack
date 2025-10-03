import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Task management
router.post('/:workspaceId/tasks', authenticateToken, taskController.createTask);
router.get('/:workspaceId/tasks', authenticateToken, taskController.getTasks);
router.get('/:workspaceId/tasks/:taskId', authenticateToken, taskController.getTask);
router.put('/:workspaceId/tasks/:taskId', authenticateToken, taskController.updateTask);
router.delete('/:workspaceId/tasks/:taskId', authenticateToken, taskController.deleteTask);

// Task operations
router.post('/:workspaceId/tasks/:taskId/assign', authenticateToken, taskController.assignTask);
router.post('/:workspaceId/tasks/:taskId/start', authenticateToken, taskController.startTask);
router.post('/:workspaceId/tasks/:taskId/cancel', authenticateToken, taskController.cancelTask);

// Task dependencies
router.post('/:workspaceId/tasks/:taskId/dependencies', authenticateToken, taskController.addTaskDependency);

// Task labels
router.get('/:workspaceId/tasks/:taskId/labels', authenticateToken, taskController.getTaskLabels);
router.post('/:workspaceId/tasks/:taskId/labels', authenticateToken, taskController.addLabelToTask);
router.delete('/:workspaceId/tasks/:taskId/labels/:labelId', authenticateToken, taskController.removeLabelFromTask);

// Task comments
router.get('/:workspaceId/tasks/:taskId/comments', authenticateToken, taskController.getTaskComments);
router.post('/:workspaceId/tasks/:taskId/comments', authenticateToken, taskController.addComment);
router.put('/:workspaceId/tasks/:taskId/comments/:commentId', authenticateToken, taskController.updateComment);
router.delete('/:workspaceId/tasks/:taskId/comments/:commentId', authenticateToken, taskController.deleteComment);

export default router;
