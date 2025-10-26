import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import taskService from '../services/taskService';
import agentService from '../services/agentService';
import {
  TaskType,
  TaskPriority,
  TaskStatus,
  DependencyType,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
} from '../types/agent';

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  taskType: z.enum(['feature', 'bug', 'refactor', 'test', 'documentation', 'review']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  context: z.object({
    files: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    relatedTasks: z.array(z.string()).optional(),
    instructions: z.string().optional(),
    codebase: z.string().optional(),
    environment: z.record(z.string()).optional(),
  }).passthrough().optional(),
  requirements: z.array(z.string()).optional(),
  estimatedEffort: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  autoAssign: z.boolean().optional().default(false),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  taskType: z.enum(['feature', 'bug', 'refactor', 'test', 'documentation', 'review']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled']).optional(),
  assignedToAgentId: z.string().optional(),
  context: z.object({
    files: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    relatedTasks: z.array(z.string()).optional(),
    instructions: z.string().optional(),
    codebase: z.string().optional(),
    environment: z.record(z.string()).optional(),
  }).passthrough().optional(),
  requirements: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
});

const getTasksQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  taskType: z.enum(['feature', 'bug', 'refactor', 'test', 'documentation', 'review']).optional(),
  assignedToAgentId: z.string().optional(),
});

const assignTaskSchema = z.object({
  agentId: z.string().uuid(),
});

const addDependencySchema = z.object({
  dependsOnTaskId: z.string().uuid(),
  dependencyType: z.enum(['blocks', 'related', 'subtask']).optional().default('blocks'),
});

const addLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

// Helper function to check workspace membership
async function checkWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }
}

// Helper function to check workspace membership and task existence
async function checkWorkspaceAndTask(workspaceId: string, taskId: string, userId: string): Promise<void> {
  await checkWorkspaceMembership(workspaceId, userId);

  const task = await taskService.getTask(taskId);
  if (!task) {
    throw new NotFoundError('Task not found');
  }

  if (task.workspaceId !== workspaceId) {
    throw new ForbiddenError('Task does not belong to this workspace');
  }
}

/**
 * POST /api/workspaces/:workspaceId/tasks
 * Create a new task
 */
export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate request body
  const data = createTaskSchema.parse(req.body);

  // Create task request
  const createRequest: CreateTaskRequest = {
    workspaceId,
    title: data.title,
    description: data.description,
    taskType: data.taskType as TaskType | undefined,
    priority: data.priority as TaskPriority,
    context: data.context,
    requirements: data.requirements,
    estimatedEffort: data.estimatedEffort,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  };

  // Create task via service
  const task = await taskService.createTask(createRequest);

  logger.info('Task created via API', { taskId: task.id, workspaceId, userId });

  // Auto-assign if requested
  if (data.autoAssign) {
    try {
      await agentService.distributeTask(task.id, workspaceId);
      logger.info('Task auto-assigned', { taskId: task.id, workspaceId });
    } catch (error) {
      logger.warn('Failed to auto-assign task', { taskId: task.id, error });
      // Don't fail the request if auto-assign fails
    }
  }

  res.status(201).json(task);
});

/**
 * GET /api/workspaces/:workspaceId/tasks/:taskId
 * Get task details with dependencies
 */
export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Get task details
  const task = await taskService.getTask(taskId);

  // Get dependencies
  const dependencies = await taskService.getTaskDependencies(taskId);

  res.json({ ...task, dependencies });
});

/**
 * GET /api/workspaces/:workspaceId/tasks
 * Get tasks with optional filters
 */
export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getTasksQuerySchema.parse(req.query);

  // Build filters
  const filters: TaskFilters = {
    status: query.status as TaskStatus | undefined,
    priority: query.priority as TaskPriority | undefined,
    taskType: query.taskType as TaskType | undefined,
    assignedToAgentId: query.assignedToAgentId,
  };

  // Get tasks
  const tasks = await taskService.getTasks(workspaceId, filters);

  res.json({ tasks });
});

/**
 * PUT /api/workspaces/:workspaceId/tasks/:taskId
 * Update task
 */
export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Validate request body
  const updates = updateTaskSchema.parse(req.body);

  // Convert dueDate if provided
  const updateRequest: UpdateTaskRequest = {
    ...updates,
    dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
    status: updates.status as TaskStatus | undefined,
    priority: updates.priority as TaskPriority | undefined,
    taskType: updates.taskType as TaskType | undefined,
  };

  // Update task
  const task = await taskService.updateTask(taskId, updateRequest);

  logger.info('Task updated via API', { taskId, workspaceId, userId });

  res.json(task);
});

/**
 * DELETE /api/workspaces/:workspaceId/tasks/:taskId
 * Delete a task
 */
export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Delete task
  await taskService.deleteTask(taskId);

  logger.info('Task deleted via API', { taskId, workspaceId, userId });

  res.json({ message: 'Task deleted successfully' });
});

/**
 * POST /api/workspaces/:workspaceId/tasks/:taskId/assign
 * Assign task to agent
 */
export const assignTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Validate request body
  const { agentId } = assignTaskSchema.parse(req.body);

  // Verify agent exists and belongs to workspace
  const agent = await agentService.getAgent(agentId);
  if (!agent) {
    throw new NotFoundError('Agent not found');
  }

  if (agent.workspaceId !== workspaceId) {
    throw new BadRequestError('Agent does not belong to this workspace');
  }

  // Assign task
  await agentService.assignTaskToAgent(taskId, agentId);

  logger.info('Task assigned via API', { taskId, agentId, workspaceId, userId });

  res.json({ message: 'Task assigned successfully', agentId });
});

/**
 * POST /api/workspaces/:workspaceId/tasks/:taskId/start
 * Start task execution
 */
export const startTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Get task to check if assigned
  const task = await taskService.getTask(taskId);

  if (!task?.assignedToAgentId) {
    throw new BadRequestError('Task must be assigned to an agent before starting');
  }

  // Check if task can start (dependencies)
  const canStart = await taskService.canStartTask(taskId);
  if (!canStart) {
    throw new BadRequestError('Task has incomplete dependencies');
  }

  // Start task (will trigger agent execution)
  await agentService.executeTask(task.assignedToAgentId, taskId);

  logger.info('Task started via API', { taskId, workspaceId, userId });

  res.json({ message: 'Task execution started' });
});

/**
 * POST /api/workspaces/:workspaceId/tasks/:taskId/cancel
 * Cancel running task
 */
export const cancelTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Cancel task execution
  await agentService.cancelTaskExecution(taskId);

  logger.info('Task cancelled via API', { taskId, workspaceId, userId });

  res.json({ message: 'Task cancelled successfully' });
});

/**
 * POST /api/workspaces/:workspaceId/tasks/:taskId/dependencies
 * Add task dependency
 */
export const addTaskDependency = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Validate request body
  const { dependsOnTaskId, dependencyType } = addDependencySchema.parse(req.body);

  // Verify the dependency task exists and belongs to same workspace
  const depTask = await taskService.getTask(dependsOnTaskId);
  if (!depTask) {
    throw new NotFoundError('Dependency task not found');
  }

  if (depTask.workspaceId !== workspaceId) {
    throw new BadRequestError('Dependency task must be in the same workspace');
  }

  // Add dependency
  await taskService.addDependency(taskId, dependsOnTaskId, dependencyType as DependencyType);

  logger.info('Task dependency added via API', {
    taskId,
    dependsOnTaskId,
    dependencyType,
    workspaceId,
    userId,
  });

  res.status(201).json({ message: 'Dependency added successfully' });
});

/**
 * GET /api/workspaces/:workspaceId/tasks/:taskId/labels
 * Get all labels for a task
 */
export const getTaskLabels = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Get labels
  const labels = await taskService.getTaskLabels(taskId);

  res.json({ labels });
});

/**
 * POST /api/workspaces/:workspaceId/tasks/:taskId/labels
 * Add a label to a task
 */
export const addTaskLabel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Validate request body
  const { name, color } = addLabelSchema.parse(req.body);

  // Add label
  const label = await taskService.addLabelToTask(taskId, name, color);

  logger.info('Label added to task via API', {
    taskId,
    labelId: label.id,
    name,
    workspaceId,
    userId,
  });

  res.status(201).json(label);
});

/**
 * DELETE /api/workspaces/:workspaceId/tasks/:taskId/labels/:labelId
 * Remove a label from a task
 */
export const removeTaskLabel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId, labelId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Verify label belongs to the task
  const labels = await taskService.getTaskLabels(taskId);
  const labelExists = labels.some(label => label.id === labelId);

  if (!labelExists) {
    throw new NotFoundError('Label not found for this task');
  }

  // Remove label
  await taskService.removeLabelFromTask(labelId);

  logger.info('Label removed from task via API', {
    taskId,
    labelId,
    workspaceId,
    userId,
  });

  res.json({ message: 'Label removed successfully' });
});

/**
 * GET /api/workspaces/:workspaceId/tasks/:taskId/comments
 * Get all comments for a task
 */
export const getTaskComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Get comments
  const comments = await taskService.getTaskComments(taskId);

  res.json({ comments });
});

/**
 * POST /api/workspaces/:workspaceId/tasks/:taskId/comments
 * Add a comment to a task
 */
export const addTaskComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Validate request body
  const { content } = addCommentSchema.parse(req.body);

  // Add comment (from user)
  const comment = await taskService.addComment(taskId, content, userId);

  logger.info('Comment added to task via API', {
    taskId,
    commentId: comment.id,
    workspaceId,
    userId,
  });

  res.status(201).json(comment);
});

/**
 * PUT /api/workspaces/:workspaceId/tasks/:taskId/comments/:commentId
 * Update a comment
 */
export const updateTaskComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId, commentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Verify comment belongs to the task and user
  const comments = await taskService.getTaskComments(taskId);
  const comment = comments.find(c => c.id === commentId);

  if (!comment) {
    throw new NotFoundError('Comment not found for this task');
  }

  // Only allow the user who created the comment to update it
  if (comment.userId !== userId) {
    throw new ForbiddenError('You can only update your own comments');
  }

  // Validate request body
  const { content } = updateCommentSchema.parse(req.body);

  // Update comment
  const updatedComment = await taskService.updateComment(commentId, content);

  logger.info('Comment updated via API', {
    taskId,
    commentId,
    workspaceId,
    userId,
  });

  res.json(updatedComment);
});

/**
 * DELETE /api/workspaces/:workspaceId/tasks/:taskId/comments/:commentId
 * Delete a comment
 */
export const deleteTaskComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, taskId, commentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and task existence
  await checkWorkspaceAndTask(workspaceId, taskId, userId);

  // Verify comment belongs to the task and user
  const comments = await taskService.getTaskComments(taskId);
  const comment = comments.find(c => c.id === commentId);

  if (!comment) {
    throw new NotFoundError('Comment not found for this task');
  }

  // Only allow the user who created the comment to delete it
  if (comment.userId !== userId) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  // Delete comment
  await taskService.deleteComment(commentId);

  logger.info('Comment deleted via API', {
    taskId,
    commentId,
    workspaceId,
    userId,
  });

  res.json({ message: 'Comment deleted successfully' });
});

// ============================================
// PROJECT-SPECIFIC TASK OPERATIONS
// ============================================

/**
 * Get all tasks for a project
 */
export const getTasksByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const tasks = await taskService.getTasksByProject(projectId);

  logger.info('Tasks retrieved by project via API', {
    projectId,
    count: tasks.length,
  });

  res.json(tasks);
});

/**
 * Get all tasks for a section
 */
export const getTasksBySection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId } = req.params;

  const tasks = await taskService.getTasksBySection(sectionId);

  logger.info('Tasks retrieved by section via API', {
    sectionId,
    count: tasks.length,
  });

  res.json(tasks);
});

/**
 * Move task to a different section
 */
export const moveTaskToSection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const { section_id, position } = req.body;

  if (!section_id) {
    throw new BadRequestError('section_id is required');
  }

  const task = await taskService.moveTaskToSection(taskId, section_id, position);

  logger.info('Task moved to section via API', {
    taskId,
    sectionId: section_id,
    position,
  });

  res.json(task);
});

/**
 * Reorder tasks within a section
 */
export const reorderTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sectionId } = req.params;
  const { task_ids } = req.body;

  if (!Array.isArray(task_ids)) {
    throw new BadRequestError('task_ids must be an array');
  }

  await taskService.reorderTasks(sectionId, task_ids);

  logger.info('Tasks reordered via API', {
    sectionId,
    count: task_ids.length,
  });

  res.json({ message: 'Tasks reordered successfully' });
});

/**
 * Mark task as complete
 */
export const completeTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;

  const task = await taskService.updateTask(taskId, {
    status: 'completed',
    completedAt: new Date(),
  });

  logger.info('Task completed via API', { taskId });

  res.json(task);
});

/**
 * Mark task as not complete
 */
export const uncompleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;

  const task = await taskService.updateTask(taskId, {
    status: 'pending',
  });

  logger.info('Task uncompleted via API', { taskId });

  res.json(task);
});
