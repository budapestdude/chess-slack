import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';

// Router for workspace-scoped task routes (mounted at /api/workspaces)
const workspaceTaskRouter = Router();

// Task management
workspaceTaskRouter.post('/:workspaceId/tasks', authenticateToken, taskController.createTask);
workspaceTaskRouter.get('/:workspaceId/tasks', authenticateToken, taskController.getTasks);
workspaceTaskRouter.get('/:workspaceId/tasks/:taskId', authenticateToken, taskController.getTask);
workspaceTaskRouter.put('/:workspaceId/tasks/:taskId', authenticateToken, taskController.updateTask);
workspaceTaskRouter.delete('/:workspaceId/tasks/:taskId', authenticateToken, taskController.deleteTask);

// Task operations
workspaceTaskRouter.post('/:workspaceId/tasks/:taskId/assign', authenticateToken, taskController.assignTask);
workspaceTaskRouter.post('/:workspaceId/tasks/:taskId/start', authenticateToken, taskController.startTask);
workspaceTaskRouter.post('/:workspaceId/tasks/:taskId/cancel', authenticateToken, taskController.cancelTask);

// Task dependencies
workspaceTaskRouter.post('/:workspaceId/tasks/:taskId/dependencies', authenticateToken, taskController.addTaskDependency);

// Task labels
workspaceTaskRouter.get('/:workspaceId/tasks/:taskId/labels', authenticateToken, taskController.getTaskLabels);
workspaceTaskRouter.post('/:workspaceId/tasks/:taskId/labels', authenticateToken, taskController.addTaskLabel);
workspaceTaskRouter.delete('/:workspaceId/tasks/:taskId/labels/:labelId', authenticateToken, taskController.removeTaskLabel);

// Task comments
workspaceTaskRouter.get('/:workspaceId/tasks/:taskId/comments', authenticateToken, taskController.getTaskComments);
workspaceTaskRouter.post('/:workspaceId/tasks/:taskId/comments', authenticateToken, taskController.addTaskComment);
workspaceTaskRouter.put('/:workspaceId/tasks/:taskId/comments/:commentId', authenticateToken, taskController.updateTaskComment);
workspaceTaskRouter.delete('/:workspaceId/tasks/:taskId/comments/:commentId', authenticateToken, taskController.deleteTaskComment);

// Router for project-scoped task routes (mounted at /api)
const projectTaskRouter = Router();

// Project-specific task routes
projectTaskRouter.get('/projects/:projectId/tasks', authenticateToken, taskController.getTasksByProject);
projectTaskRouter.get('/sections/:sectionId/tasks', authenticateToken, taskController.getTasksBySection);
projectTaskRouter.post('/tasks/:taskId/move', authenticateToken, taskController.moveTaskToSection);
projectTaskRouter.post('/sections/:sectionId/tasks/reorder', authenticateToken, taskController.reorderTasks);
projectTaskRouter.post('/tasks/:taskId/complete', authenticateToken, taskController.completeTask);
projectTaskRouter.post('/tasks/:taskId/uncomplete', authenticateToken, taskController.uncompleteTask);

export { workspaceTaskRouter, projectTaskRouter };
