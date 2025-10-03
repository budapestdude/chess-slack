import { EventEmitter } from 'events';
import { pool } from '../database/db';
import logger from '../utils/logger';
import { AgentFactory } from '../agents/AgentFactory';
import { BaseAgent } from '../agents/BaseAgent';
import taskService from './taskService';
import {
  Agent,
  AgentTask,
  AgentStatus,
  AgentMetrics,
  CreateAgentRequest,
  UpdateAgentRequest,
  TaskResults,
  AgentConversation,
  ConversationMessage,
  ConversationRole,
  ExecutionLog,
} from '../types/agent';

/**
 * Service for managing AI agents in the ChessSlack system.
 * Handles agent lifecycle, task execution, communication, monitoring, and coordination.
 */
class AgentService extends EventEmitter {
  // In-memory cache of active agent instances
  private agentInstances: Map<string, BaseAgent> = new Map();

  // Track active task executions for cancellation
  private activeExecutions: Map<string, { agentId: string; aborted: boolean }> = new Map();

  constructor() {
    super();
    logger.info('AgentService initialized');
  }

  // ============================================
  // AGENT LIFECYCLE MANAGEMENT
  // ============================================

  /**
   * Create a new agent instance
   */
  async createAgent(data: CreateAgentRequest, createdBy: string): Promise<Agent> {
    try {
      logger.info('Creating agent', { name: data.name, type: data.type, workspaceId: data.workspaceId });

      // Validate configuration if provided
      if (data.configuration) {
        AgentFactory.validateConfiguration(data.configuration);
      }

      // Use AgentFactory to create agent (which also persists to DB)
      const agentInstance = await AgentFactory.createAgent(
        data.workspaceId,
        createdBy,
        data.type,
        data.name,
        data.description,
        data.capabilities,
        data.configuration
      );

      // Get the agent data from database
      const result = await pool.query(
        `SELECT id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at
         FROM agents WHERE id = $1`,
        [agentInstance.getId()]
      );

      const agent: Agent = this.mapRowToAgent(result.rows[0]);

      logger.info('Agent created', { agentId: agent.id, name: agent.name });

      // Emit event for real-time updates
      this.emit('agentCreated', { agent });

      return agent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating agent', { error: errorMessage, data });
      throw new Error(`Failed to create agent: ${errorMessage}`);
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      const result = await pool.query(
        `SELECT id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at
         FROM agents WHERE id = $1`,
        [agentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAgent(result.rows[0]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting agent', { error: errorMessage, agentId });
      throw new Error(`Failed to get agent: ${errorMessage}`);
    }
  }

  /**
   * Get all agents in a workspace
   */
  async getWorkspaceAgents(workspaceId: string): Promise<Agent[]> {
    try {
      const result = await pool.query(
        `SELECT id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at
         FROM agents WHERE workspace_id = $1
         ORDER BY created_at DESC`,
        [workspaceId]
      );

      return result.rows.map(row => this.mapRowToAgent(row));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting workspace agents', { error: errorMessage, workspaceId });
      throw new Error(`Failed to get workspace agents: ${errorMessage}`);
    }
  }

  /**
   * Update agent configuration
   */
  async updateAgent(agentId: string, updates: UpdateAgentRequest): Promise<Agent> {
    try {
      logger.info('Updating agent', { agentId, updates });

      // Validate configuration if provided
      if (updates.configuration) {
        AgentFactory.validateConfiguration(updates.configuration);
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.capabilities !== undefined) {
        fields.push(`capabilities = $${paramIndex++}`);
        values.push(JSON.stringify(updates.capabilities));
      }
      if (updates.configuration !== undefined) {
        fields.push(`configuration = $${paramIndex++}`);
        values.push(JSON.stringify(updates.configuration));
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(agentId);

      const result = await pool.query(
        `UPDATE agents
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Agent not found');
      }

      const agent = this.mapRowToAgent(result.rows[0]);

      // Invalidate cached instance if configuration changed
      if (updates.configuration) {
        this.agentInstances.delete(agentId);
      }

      logger.info('Agent updated', { agentId });
      this.emit('agentUpdated', { agent });

      return agent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating agent', { error: errorMessage, agentId, updates });
      throw new Error(`Failed to update agent: ${errorMessage}`);
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    try {
      logger.info('Deleting agent', { agentId });

      // Stop agent if running
      if (this.agentInstances.has(agentId)) {
        await this.stopAgent(agentId);
      }

      const result = await pool.query(
        'DELETE FROM agents WHERE id = $1 RETURNING id',
        [agentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Agent not found');
      }

      logger.info('Agent deleted', { agentId });
      this.emit('agentDeleted', { agentId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting agent', { error: errorMessage, agentId });
      throw new Error(`Failed to delete agent: ${errorMessage}`);
    }
  }

  /**
   * Start an agent (set status to idle and begin listening for tasks)
   */
  async startAgent(agentId: string): Promise<void> {
    try {
      logger.info('Starting agent', { agentId });

      // Load or get cached agent instance
      const agentInstance = await this.getAgentInstance(agentId);

      // Initialize agent
      await agentInstance.initialize();

      logger.info('Agent started', { agentId, name: agentInstance.getName() });
      this.emit('agentStarted', {
        agentId,
        name: agentInstance.getName(),
        status: 'idle',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error starting agent', { error: errorMessage, agentId });
      throw new Error(`Failed to start agent: ${errorMessage}`);
    }
  }

  /**
   * Stop an agent gracefully
   */
  async stopAgent(agentId: string): Promise<void> {
    try {
      logger.info('Stopping agent', { agentId });

      const agentInstance = this.agentInstances.get(agentId);

      if (agentInstance) {
        // Shutdown agent instance
        await agentInstance.shutdown();

        // Remove from cache
        this.agentInstances.delete(agentId);
      } else {
        // Just update status in database
        await pool.query(
          `UPDATE agents SET status = 'offline', updated_at = NOW() WHERE id = $1`,
          [agentId]
        );
      }

      logger.info('Agent stopped', { agentId });
      this.emit('agentStopped', { agentId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error stopping agent', { error: errorMessage, agentId });
      throw new Error(`Failed to stop agent: ${errorMessage}`);
    }
  }

  /**
   * Restart an agent
   */
  async restartAgent(agentId: string): Promise<void> {
    try {
      logger.info('Restarting agent', { agentId });

      await this.stopAgent(agentId);
      await this.startAgent(agentId);

      logger.info('Agent restarted', { agentId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error restarting agent', { error: errorMessage, agentId });
      throw new Error(`Failed to restart agent: ${errorMessage}`);
    }
  }

  // ============================================
  // TASK EXECUTION MANAGEMENT
  // ============================================

  /**
   * Assign task to agent and trigger execution
   */
  async assignTaskToAgent(taskId: string, agentId: string): Promise<void> {
    try {
      logger.info('Assigning task to agent', { taskId, agentId });

      // Verify agent exists and is available
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Assign task
      await taskService.assignTask(taskId, agentId);

      logger.info('Task assigned', { taskId, agentId });
      this.emit('taskAssigned', { taskId, agentId });

      // Execute task asynchronously
      this.executeTask(agentId, taskId).catch(error => {
        logger.error('Task execution failed', { error, taskId, agentId });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error assigning task', { error: errorMessage, taskId, agentId });
      throw new Error(`Failed to assign task: ${errorMessage}`);
    }
  }

  /**
   * Execute a task using an agent
   */
  async executeTask(agentId: string, taskId: string): Promise<TaskResults> {
    const startTime = Date.now();

    try {
      logger.info('Executing task', { agentId, taskId });

      // Track execution for cancellation
      this.activeExecutions.set(taskId, { agentId, aborted: false });

      // Load agent instance
      const agentInstance = await this.getAgentInstance(agentId);

      // Validate agent status
      const currentStatus = agentInstance.getStatus();
      if (currentStatus !== 'idle' && currentStatus !== 'busy') {
        throw new Error(`Agent is ${currentStatus} and cannot execute tasks`);
      }

      // Get task
      const task = await taskService.getTask(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check if task can start (dependencies)
      const canStart = await taskService.canStartTask(taskId);
      if (!canStart) {
        throw new Error('Task has incomplete dependencies');
      }

      // Set agent status to busy
      await agentInstance.updateStatus('busy');

      // Start task
      await taskService.startTask(taskId);

      // Check for abort before execution
      const execution = this.activeExecutions.get(taskId);
      if (execution?.aborted) {
        throw new Error('Task execution was cancelled');
      }

      // Execute task
      const results = await agentInstance.executeTask(task);

      // Check for abort after execution
      if (execution?.aborted) {
        throw new Error('Task execution was cancelled');
      }

      // Complete task
      await taskService.completeTask(taskId, results);

      // Set agent status back to idle
      await agentInstance.updateStatus('idle');

      // Update agent metrics
      await this.updateAgentMetrics(agentId, true, Date.now() - startTime);

      logger.info('Task completed successfully', {
        agentId,
        taskId,
        durationMs: Date.now() - startTime,
      });

      this.emit('taskCompleted', {
        taskId,
        agentId,
        status: 'completed',
        results,
      });

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Task execution failed', {
        error: errorMessage,
        agentId,
        taskId,
        durationMs: Date.now() - startTime,
      });

      // Fail task
      await taskService.failTask(taskId, errorMessage);

      // Set agent status to error or idle depending on error type
      try {
        const agentInstance = this.agentInstances.get(agentId);
        if (agentInstance) {
          // If it's a cancellation, set to idle, otherwise error
          const status = errorMessage.includes('cancelled') ? 'idle' : 'error';
          await agentInstance.updateStatus(status);
        }
      } catch (statusError) {
        logger.error('Failed to update agent status after error', {
          error: statusError,
          agentId,
        });
      }

      // Update agent metrics
      await this.updateAgentMetrics(agentId, false, Date.now() - startTime);

      this.emit('taskFailed', {
        taskId,
        agentId,
        status: 'failed',
        error: errorMessage,
      });

      throw new Error(`Task execution failed: ${errorMessage}`);
    } finally {
      // Clean up execution tracking
      this.activeExecutions.delete(taskId);
    }
  }

  /**
   * Cancel a running task execution
   */
  async cancelTaskExecution(taskId: string): Promise<void> {
    try {
      logger.info('Cancelling task execution', { taskId });

      const execution = this.activeExecutions.get(taskId);
      if (!execution) {
        logger.warn('Task execution not found or already completed', { taskId });
        return;
      }

      // Mark as aborted
      execution.aborted = true;

      // Cancel task in database
      await taskService.cancelTask(taskId);

      logger.info('Task execution cancelled', { taskId, agentId: execution.agentId });
      this.emit('taskCancelled', { taskId, agentId: execution.agentId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error cancelling task execution', { error: errorMessage, taskId });
      throw new Error(`Failed to cancel task execution: ${errorMessage}`);
    }
  }

  /**
   * Retry a failed task
   */
  async retryFailedTask(taskId: string): Promise<void> {
    try {
      logger.info('Retrying failed task', { taskId });

      const task = await taskService.getTask(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== 'failed') {
        throw new Error('Task is not in failed status');
      }

      // Reset task to pending
      await taskService.updateTask(taskId, {
        status: 'pending',
        errorLog: undefined,
      });

      // If task has an assigned agent, execute it
      if (task.assignedToAgentId) {
        await this.executeTask(task.assignedToAgentId, taskId);
      }

      logger.info('Task retry initiated', { taskId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error retrying task', { error: errorMessage, taskId });
      throw new Error(`Failed to retry task: ${errorMessage}`);
    }
  }

  // ============================================
  // AGENT COMMUNICATION
  // ============================================

  /**
   * Send a message to an agent (for interactive communication)
   */
  async sendMessageToAgent(agentId: string, message: string): Promise<void> {
    try {
      logger.info('Sending message to agent', { agentId, messageLength: message.length });

      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Create execution log for the message
      await pool.query(
        `INSERT INTO agent_execution_logs
         (agent_id, action, details, success, output, created_at)
         VALUES ($1, 'message_received', $2, true, $3, NOW())`,
        [agentId, JSON.stringify({ source: 'user' }), message]
      );

      logger.info('Message sent to agent', { agentId });
      this.emit('messageSent', { agentId, message });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error sending message to agent', { error: errorMessage, agentId });
      throw new Error(`Failed to send message to agent: ${errorMessage}`);
    }
  }

  /**
   * Create a new agent conversation
   */
  async createAgentConversation(
    workspaceId: string,
    taskId?: string
  ): Promise<AgentConversation> {
    try {
      logger.info('Creating agent conversation', { workspaceId, taskId });

      const result = await pool.query(
        `INSERT INTO agent_conversations (workspace_id, task_id, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, workspace_id, task_id, channel_id, title, created_at, updated_at`,
        [workspaceId, taskId || null]
      );

      const conversation: AgentConversation = {
        id: result.rows[0].id,
        workspaceId: result.rows[0].workspace_id,
        taskId: result.rows[0].task_id,
        channelId: result.rows[0].channel_id,
        title: result.rows[0].title,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      logger.info('Conversation created', { conversationId: conversation.id });
      this.emit('conversationCreated', { conversation });

      return conversation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating conversation', { error: errorMessage, workspaceId });
      throw new Error(`Failed to create conversation: ${errorMessage}`);
    }
  }

  /**
   * Add a message to a conversation
   */
  async addConversationMessage(
    conversationId: string,
    message: Partial<ConversationMessage>
  ): Promise<ConversationMessage> {
    try {
      logger.info('Adding conversation message', { conversationId });

      // Verify conversation exists
      const convCheck = await pool.query(
        'SELECT id FROM agent_conversations WHERE id = $1',
        [conversationId]
      );

      if (convCheck.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const result = await pool.query(
        `INSERT INTO conversation_messages
         (conversation_id, agent_id, user_id, role, content, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, conversation_id, agent_id, user_id, role, content, metadata, created_at`,
        [
          conversationId,
          message.agentId || null,
          message.userId || null,
          message.role,
          message.content,
          JSON.stringify(message.metadata || {}),
        ]
      );

      // Update conversation updated_at
      await pool.query(
        'UPDATE agent_conversations SET updated_at = NOW() WHERE id = $1',
        [conversationId]
      );

      const conversationMessage: ConversationMessage = {
        id: result.rows[0].id,
        conversationId: result.rows[0].conversation_id,
        agentId: result.rows[0].agent_id,
        userId: result.rows[0].user_id,
        role: result.rows[0].role as ConversationRole,
        content: result.rows[0].content,
        metadata: result.rows[0].metadata,
        createdAt: result.rows[0].created_at,
      };

      logger.info('Message added to conversation', { conversationId, messageId: conversationMessage.id });
      this.emit('messageAdded', { conversationId, message: conversationMessage });

      return conversationMessage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error adding conversation message', { error: errorMessage, conversationId });
      throw new Error(`Failed to add conversation message: ${errorMessage}`);
    }
  }

  /**
   * Get a conversation with all its messages
   */
  async getConversation(
    conversationId: string
  ): Promise<AgentConversation & { messages: ConversationMessage[] }> {
    try {
      const convResult = await pool.query(
        `SELECT id, workspace_id, task_id, channel_id, title, created_at, updated_at
         FROM agent_conversations WHERE id = $1`,
        [conversationId]
      );

      if (convResult.rows.length === 0) {
        throw new Error('Conversation not found');
      }

      const conversation: AgentConversation = {
        id: convResult.rows[0].id,
        workspaceId: convResult.rows[0].workspace_id,
        taskId: convResult.rows[0].task_id,
        channelId: convResult.rows[0].channel_id,
        title: convResult.rows[0].title,
        createdAt: convResult.rows[0].created_at,
        updatedAt: convResult.rows[0].updated_at,
      };

      const messagesResult = await pool.query(
        `SELECT id, conversation_id, agent_id, user_id, role, content, metadata, created_at
         FROM conversation_messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
      );

      const messages: ConversationMessage[] = messagesResult.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        agentId: row.agent_id,
        userId: row.user_id,
        role: row.role as ConversationRole,
        content: row.content,
        metadata: row.metadata,
        createdAt: row.created_at,
      }));

      return { ...conversation, messages };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting conversation', { error: errorMessage, conversationId });
      throw new Error(`Failed to get conversation: ${errorMessage}`);
    }
  }

  // ============================================
  // AGENT MONITORING
  // ============================================

  /**
   * Get agent's current status
   */
  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    try {
      const result = await pool.query('SELECT status FROM agents WHERE id = $1', [agentId]);

      if (result.rows.length === 0) {
        throw new Error('Agent not found');
      }

      return result.rows[0].status as AgentStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting agent status', { error: errorMessage, agentId });
      throw new Error(`Failed to get agent status: ${errorMessage}`);
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    try {
      const result = await pool.query('SELECT metrics FROM agents WHERE id = $1', [agentId]);

      if (result.rows.length === 0) {
        throw new Error('Agent not found');
      }

      return result.rows[0].metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting agent metrics', { error: errorMessage, agentId });
      throw new Error(`Failed to get agent metrics: ${errorMessage}`);
    }
  }

  /**
   * Get recent execution logs for an agent
   */
  async getAgentLogs(agentId: string, limit: number = 100): Promise<ExecutionLog[]> {
    try {
      const result = await pool.query(
        `SELECT id, agent_id, task_id, action, details, success, output, error, duration_ms, created_at
         FROM agent_execution_logs
         WHERE agent_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [agentId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        agentId: row.agent_id,
        taskId: row.task_id,
        action: row.action,
        details: row.details,
        success: row.success,
        output: row.output,
        error: row.error,
        durationMs: row.duration_ms,
        createdAt: row.created_at,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting agent logs', { error: errorMessage, agentId });
      throw new Error(`Failed to get agent logs: ${errorMessage}`);
    }
  }

  /**
   * Get active agents (not offline)
   */
  async getActiveAgents(workspaceId: string): Promise<Agent[]> {
    try {
      const result = await pool.query(
        `SELECT id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at
         FROM agents
         WHERE workspace_id = $1 AND status != 'offline'
         ORDER BY created_at DESC`,
        [workspaceId]
      );

      return result.rows.map(row => this.mapRowToAgent(row));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting active agents', { error: errorMessage, workspaceId });
      throw new Error(`Failed to get active agents: ${errorMessage}`);
    }
  }

  // ============================================
  // AGENT COORDINATION
  // ============================================

  /**
   * Find the best agent for a task based on capabilities and availability
   */
  async findBestAgentForTask(taskId: string, workspaceId: string): Promise<string | null> {
    try {
      logger.info('Finding best agent for task', { taskId, workspaceId });

      // Get task details
      const task = await taskService.getTask(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Get all active agents in workspace
      const agents = await this.getActiveAgents(workspaceId);

      if (agents.length === 0) {
        logger.warn('No active agents found', { workspaceId });
        return null;
      }

      // Score each agent
      const scoredAgents = agents.map(agent => {
        let score = 0;

        // 1. Check agent type matches task type
        if (task.taskType) {
          const typeMatch = this.checkTypeMatch(agent.type, task.taskType);
          if (typeMatch) {
            score += 50;
          } else if (agent.type === 'general-purpose') {
            // General purpose agents can handle any task, but lower priority
            score += 20;
          }
        } else {
          // If no task type specified, general purpose is preferred
          if (agent.type === 'general-purpose') {
            score += 30;
          } else {
            score += 10;
          }
        }

        // 2. Check agent capabilities match task requirements
        if (task.requirements && task.requirements.length > 0) {
          const matchingCapabilities = task.requirements.filter(req =>
            agent.capabilities.some(cap =>
              cap.toLowerCase().includes(req.toLowerCase()) ||
              req.toLowerCase().includes(cap.toLowerCase())
            )
          );
          score += matchingCapabilities.length * 10;
        }

        // 3. Prefer idle agents over busy ones
        if (agent.status === 'idle') {
          score += 30;
        } else if (agent.status === 'busy') {
          score += 10; // Still consider busy agents but with lower priority
        } else {
          // Error or offline agents get no additional score
          score += 0;
        }

        // 4. Consider agent metrics (success rate)
        if (agent.metrics.successRate !== undefined) {
          score += agent.metrics.successRate * 0.2; // Max 20 points for 100% success rate
        }

        // 5. Consider average completion time (prefer faster agents)
        if (agent.metrics.avgEffortMinutes !== undefined && agent.metrics.avgEffortMinutes > 0) {
          const timeScore = Math.max(0, 10 - agent.metrics.avgEffortMinutes / 10);
          score += timeScore;
        }

        // 6. Check concurrent task capacity
        const maxConcurrent = agent.configuration.maxConcurrentTasks || 1;
        if (agent.status === 'busy' && maxConcurrent <= 1) {
          score -= 20; // Penalize busy agents that can't handle concurrent tasks
        }

        return { agent, score };
      });

      // Sort by score (descending)
      scoredAgents.sort((a, b) => b.score - a.score);

      // Log scoring results
      logger.info('Agent scoring results', {
        taskId,
        scores: scoredAgents.map(s => ({
          agentId: s.agent.id,
          name: s.agent.name,
          type: s.agent.type,
          status: s.agent.status,
          score: s.score,
        })),
      });

      // Return best agent (or null if no suitable agent found)
      const bestAgent = scoredAgents[0];
      if (bestAgent && bestAgent.score > 0) {
        logger.info('Best agent found', {
          taskId,
          agentId: bestAgent.agent.id,
          agentName: bestAgent.agent.name,
          score: bestAgent.score,
        });
        return bestAgent.agent.id;
      }

      logger.warn('No suitable agent found for task', { taskId });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error finding best agent for task', { error: errorMessage, taskId });
      throw new Error(`Failed to find best agent for task: ${errorMessage}`);
    }
  }

  /**
   * Auto-assign task to best available agent
   */
  async distributeTask(taskId: string, workspaceId: string): Promise<void> {
    try {
      logger.info('Distributing task', { taskId, workspaceId });

      const bestAgentId = await this.findBestAgentForTask(taskId, workspaceId);

      if (!bestAgentId) {
        logger.warn('No suitable agent found for task distribution', { taskId });
        throw new Error('No suitable agent available for this task');
      }

      await this.assignTaskToAgent(taskId, bestAgentId);

      logger.info('Task distributed', { taskId, agentId: bestAgentId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error distributing task', { error: errorMessage, taskId });
      throw new Error(`Failed to distribute task: ${errorMessage}`);
    }
  }

  /**
   * Rebalance tasks if agents are overloaded
   */
  async rebalanceTasks(workspaceId: string): Promise<void> {
    try {
      logger.info('Rebalancing tasks', { workspaceId });

      // Get all active agents
      const agents = await this.getActiveAgents(workspaceId);

      if (agents.length === 0) {
        logger.warn('No active agents for rebalancing', { workspaceId });
        return;
      }

      // Get all pending unassigned tasks
      const unassignedTasks = await taskService.getAvailableTasks(workspaceId);

      // Distribute unassigned tasks
      for (const task of unassignedTasks) {
        try {
          await this.distributeTask(task.id, workspaceId);
        } catch (error) {
          logger.warn('Failed to distribute task during rebalancing', {
            taskId: task.id,
            error,
          });
          // Continue with next task
        }
      }

      // Check for overloaded agents (busy with too many tasks)
      const busyAgents = agents.filter(a => a.status === 'busy');
      const idleAgents = agents.filter(a => a.status === 'idle');

      if (idleAgents.length > 0 && busyAgents.length > 0) {
        // Could implement more sophisticated rebalancing logic here
        // For now, just log the situation
        logger.info('Task distribution status', {
          workspaceId,
          busyAgents: busyAgents.length,
          idleAgents: idleAgents.length,
          unassignedTasks: unassignedTasks.length,
        });
      }

      logger.info('Task rebalancing completed', { workspaceId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error rebalancing tasks', { error: errorMessage, workspaceId });
      throw new Error(`Failed to rebalance tasks: ${errorMessage}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get or load agent instance from cache
   */
  private async getAgentInstance(agentId: string): Promise<BaseAgent> {
    // Check cache first
    if (this.agentInstances.has(agentId)) {
      return this.agentInstances.get(agentId)!;
    }

    // Load from database using AgentFactory
    const agentInstance = await AgentFactory.loadAgent(agentId);

    // Cache the instance
    this.agentInstances.set(agentId, agentInstance);

    return agentInstance;
  }

  /**
   * Update agent metrics after task execution
   */
  private async updateAgentMetrics(
    agentId: string,
    success: boolean,
    durationMs: number
  ): Promise<void> {
    try {
      const result = await pool.query('SELECT metrics FROM agents WHERE id = $1', [agentId]);

      if (result.rows.length === 0) {
        return;
      }

      const metrics: AgentMetrics = result.rows[0].metrics || {};

      // Update metrics
      metrics.totalTasks = (metrics.totalTasks || 0) + 1;
      if (success) {
        metrics.completedTasks = (metrics.completedTasks || 0) + 1;
      } else {
        metrics.failedTasks = (metrics.failedTasks || 0) + 1;
      }

      metrics.successRate =
        metrics.totalTasks > 0
          ? Math.round((metrics.completedTasks! / metrics.totalTasks) * 100)
          : 0;

      // Update average effort (in minutes)
      const effortMinutes = durationMs / 60000;
      const totalEffort = (metrics.avgEffortMinutes || 0) * (metrics.totalTasks - 1);
      metrics.avgEffortMinutes = (totalEffort + effortMinutes) / metrics.totalTasks;

      metrics.lastUpdated = new Date();

      // Save metrics
      await pool.query(
        'UPDATE agents SET metrics = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(metrics), agentId]
      );
    } catch (error) {
      logger.error('Failed to update agent metrics', { error, agentId });
    }
  }

  /**
   * Check if agent type matches task type
   */
  private checkTypeMatch(agentType: string, taskType: string): boolean {
    const typeMatches: Record<string, string[]> = {
      'code-validator': ['review', 'bug'],
      'ui-designer': ['feature', 'refactor'],
      'test-engineer': ['test'],
      'database-specialist': ['feature', 'refactor'],
      'general-purpose': ['feature', 'bug', 'refactor', 'documentation'],
    };

    const matchingTypes = typeMatches[agentType] || [];
    return matchingTypes.includes(taskType);
  }

  /**
   * Map database row to Agent object
   */
  private mapRowToAgent(row: any): Agent {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      type: row.type,
      description: row.description,
      status: row.status,
      capabilities: row.capabilities,
      configuration: row.configuration,
      metrics: row.metrics,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new AgentService();
