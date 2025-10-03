/**
 * WebSocket handlers for Agent System
 *
 * This module sets up real-time communication for the AI agent system,
 * broadcasting agent status changes, task updates, and execution progress
 * to connected clients.
 */

import { Server, Socket } from 'socket.io';
import agentService from '../services/agentService';
import taskService from '../services/taskService';
import logger from '../utils/logger';
import pool from '../database/db';

/**
 * Initialize agent-related WebSocket handlers
 */
export function setupAgentSocketHandlers(io: Server) {
  logger.info('Setting up agent WebSocket handlers');

  // Listen to agentService events and broadcast to clients
  setupAgentServiceBroadcasts(io);
}

/**
 * Setup broadcasts from agentService events to WebSocket clients
 */
function setupAgentServiceBroadcasts(io: Server) {
  // Agent lifecycle events
  agentService.on('agentCreated', (data: { workspaceId: string; agent: any }) => {
    logger.debug('Broadcasting agentCreated event', { agentId: data.agent.id, workspaceId: data.workspaceId });
    io.to(`workspace:${data.workspaceId}`).emit('agent:created', {
      agent: data.agent,
    });
  });

  agentService.on('agentUpdated', (data: { workspaceId: string; agent: any }) => {
    logger.debug('Broadcasting agentUpdated event', { agentId: data.agent.id, workspaceId: data.workspaceId });
    io.to(`workspace:${data.workspaceId}`).emit('agent:updated', {
      agent: data.agent,
    });
  });

  agentService.on('agentDeleted', (data: { workspaceId: string; agentId: string }) => {
    logger.debug('Broadcasting agentDeleted event', { agentId: data.agentId, workspaceId: data.workspaceId });
    io.to(`workspace:${data.workspaceId}`).emit('agent:deleted', {
      agentId: data.agentId,
    });
  });

  agentService.on('agentStarted', (data: { workspaceId: string; agentId: string; name: string }) => {
    logger.debug('Broadcasting agentStarted event', { agentId: data.agentId, workspaceId: data.workspaceId });
    io.to(`workspace:${data.workspaceId}`).emit('agent:started', {
      agentId: data.agentId,
      name: data.name,
      status: 'idle',
    });
  });

  agentService.on('agentStopped', (data: { workspaceId: string; agentId: string; name: string }) => {
    logger.debug('Broadcasting agentStopped event', { agentId: data.agentId, workspaceId: data.workspaceId });
    io.to(`workspace:${data.workspaceId}`).emit('agent:stopped', {
      agentId: data.agentId,
      name: data.name,
      status: 'offline',
    });
  });

  // Agent status changes
  agentService.on('agentStatusChanged', (data: {
    workspaceId: string;
    agentId: string;
    name: string;
    status: string;
    currentTaskId?: string
  }) => {
    logger.debug('Broadcasting agentStatusChanged event', {
      agentId: data.agentId,
      workspaceId: data.workspaceId,
      status: data.status
    });
    io.to(`workspace:${data.workspaceId}`).emit('agent:status-changed', {
      agentId: data.agentId,
      name: data.name,
      status: data.status,
      currentTaskId: data.currentTaskId,
    });
  });

  // Task events
  agentService.on('taskAssigned', (data: {
    workspaceId: string;
    taskId: string;
    agentId: string;
    taskTitle: string
  }) => {
    logger.debug('Broadcasting taskAssigned event', {
      taskId: data.taskId,
      agentId: data.agentId,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('task:assigned', {
      taskId: data.taskId,
      agentId: data.agentId,
      taskTitle: data.taskTitle,
    });
  });

  agentService.on('taskStarted', (data: {
    workspaceId: string;
    taskId: string;
    agentId: string
  }) => {
    logger.debug('Broadcasting taskStarted event', {
      taskId: data.taskId,
      agentId: data.agentId,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('task:started', {
      taskId: data.taskId,
      agentId: data.agentId,
      status: 'in_progress',
    });
  });

  agentService.on('taskProgress', (data: {
    workspaceId: string;
    taskId: string;
    agentId: string;
    progress: number;
    message?: string
  }) => {
    logger.debug('Broadcasting taskProgress event', {
      taskId: data.taskId,
      agentId: data.agentId,
      progress: data.progress,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('task:progress', {
      taskId: data.taskId,
      agentId: data.agentId,
      progress: data.progress,
      message: data.message,
    });
  });

  agentService.on('taskCompleted', (data: {
    workspaceId: string;
    taskId: string;
    agentId: string;
    results?: any
  }) => {
    logger.debug('Broadcasting taskCompleted event', {
      taskId: data.taskId,
      agentId: data.agentId,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('task:completed', {
      taskId: data.taskId,
      agentId: data.agentId,
      status: 'completed',
      results: data.results,
    });
  });

  agentService.on('taskFailed', (data: {
    workspaceId: string;
    taskId: string;
    agentId: string;
    error: string
  }) => {
    logger.debug('Broadcasting taskFailed event', {
      taskId: data.taskId,
      agentId: data.agentId,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('task:failed', {
      taskId: data.taskId,
      agentId: data.agentId,
      status: 'failed',
      error: data.error,
    });
  });

  agentService.on('taskCancelled', (data: {
    workspaceId: string;
    taskId: string
  }) => {
    logger.debug('Broadcasting taskCancelled event', {
      taskId: data.taskId,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('task:cancelled', {
      taskId: data.taskId,
      status: 'cancelled',
    });
  });

  // Conversation events
  agentService.on('conversationCreated', (data: {
    workspaceId: string;
    conversation: any
  }) => {
    logger.debug('Broadcasting conversationCreated event', {
      conversationId: data.conversation.id,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('conversation:created', {
      conversation: data.conversation,
    });
  });

  agentService.on('messageAdded', (data: {
    workspaceId: string;
    conversationId: string;
    message: any
  }) => {
    logger.debug('Broadcasting messageAdded event', {
      conversationId: data.conversationId,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('conversation:message', {
      conversationId: data.conversationId,
      message: data.message,
    });
  });

  // Artifact events
  agentService.on('artifactCreated', (data: {
    workspaceId: string;
    artifact: any
  }) => {
    logger.debug('Broadcasting artifactCreated event', {
      artifactId: data.artifact.id,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('artifact:created', {
      artifact: data.artifact,
    });
  });

  agentService.on('reviewRequested', (data: {
    workspaceId: string;
    artifactId: string;
    reviewerId: string
  }) => {
    logger.debug('Broadcasting reviewRequested event', {
      artifactId: data.artifactId,
      reviewerId: data.reviewerId,
      workspaceId: data.workspaceId
    });
    io.to(`workspace:${data.workspaceId}`).emit('review:requested', {
      artifactId: data.artifactId,
      reviewerId: data.reviewerId,
    });
  });

  logger.info('Agent service event broadcasts configured');
}

/**
 * Setup client-initiated WebSocket events for agents
 */
export function setupAgentClientHandlers(socket: Socket, userId: string) {
  // Join agent-specific rooms
  socket.on('join-agent-room', async (agentId: string, callback?: (success: boolean) => void) => {
    // Validate agent access
    try {
      const agent = await agentService.getAgent(agentId);
      if (!agent) {
        logger.warn('Invalid agent ID in join-agent-room', { socketId: socket.id, agentId });
        if (callback) callback(false);
        return;
      }

      // Check if user has access to workspace
      const memberCheck = await pool.query(
        'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [agent.workspaceId, userId]
      );

      if (memberCheck.rows.length === 0) {
        logger.warn('Unauthorized agent room join attempt', { socketId: socket.id, userId, agentId });
        if (callback) callback(false);
        return;
      }

      socket.join(`agent:${agentId}`);
      logger.debug('Socket joined agent room', { socketId: socket.id, agentId });

      if (callback) callback(true);
    } catch (error) {
      logger.error('Error in join-agent-room', { error, socketId: socket.id });
      if (callback) callback(false);
    }
  });

  // Leave agent room
  socket.on('leave-agent-room', (agentId: string) => {
    socket.leave(`agent:${agentId}`);
    logger.debug('Socket left agent room', { socketId: socket.id, agentId });
  });

  // Subscribe to task updates
  socket.on('subscribe-task', async (taskId: string, callback?: (success: boolean) => void) => {
    try {
      const task = await taskService.getTask(taskId);
      if (!task) {
        logger.warn('Invalid task ID in subscribe-task', { socketId: socket.id, taskId });
        if (callback) callback(false);
        return;
      }

      // Check workspace access
      const memberCheck = await pool.query(
        'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [task.workspaceId, userId]
      );

      if (memberCheck.rows.length === 0) {
        logger.warn('Unauthorized task subscription attempt', { socketId: socket.id, userId, taskId });
        if (callback) callback(false);
        return;
      }

      socket.join(`task:${taskId}`);
      logger.debug('Socket subscribed to task', { socketId: socket.id, taskId });

      if (callback) callback(true);
    } catch (error) {
      logger.error('Error in subscribe-task', { error, socketId: socket.id });
      if (callback) callback(false);
    }
  });

  // Unsubscribe from task
  socket.on('unsubscribe-task', (taskId: string) => {
    socket.leave(`task:${taskId}`);
    logger.debug('Socket unsubscribed from task', { socketId: socket.id, taskId });
  });
}

// export default { setupAgentSocketHandlers, setupAgentClientHandlers };
