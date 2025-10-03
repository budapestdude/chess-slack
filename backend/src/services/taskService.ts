import pool from '../database/db';
import logger from '../utils/logger';
import {
  AgentTask,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
  TaskDependency,
  DependencyType,
  TaskResults,
  TaskStatus,
  TaskPriority,
  TaskLabel,
  TaskComment,
} from '../types/agent';

/**
 * Service for managing agent tasks in the ChessSlack AI agent system.
 * Handles CRUD operations, task assignment, dependencies, and status management.
 */
class TaskService {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Create a new task
   */
  async createTask(
    data: CreateTaskRequest,
    createdByAgentId?: string
  ): Promise<AgentTask> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO agent_tasks (
          workspace_id, created_by_agent_id, assigned_to_agent_id, assigned_to_user_id, parent_task_id,
          title, description, task_type, priority, context, requirements,
          estimated_effort, due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          data.workspaceId,
          createdByAgentId || null,
          data.assignedToAgentId || null,
          data.assignedToUserId || null,
          data.parentTaskId || null,
          data.title,
          data.description || null,
          data.taskType || null,
          data.priority || 'medium',
          JSON.stringify(data.context || {}),
          JSON.stringify(data.requirements || []),
          data.estimatedEffort || null,
          data.dueDate || null,
        ]
      );

      await client.query('COMMIT');

      const task = this.mapRowToTask(result.rows[0]);
      logger.info('Task created', { taskId: task.id, title: task.title });

      return task;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating task', { error, data });
      throw new Error(`Failed to create task: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<AgentTask | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM agent_tasks WHERE id = $1',
        [taskId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      logger.error('Error getting task', { error, taskId });
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  /**
   * Get tasks with optional filters
   */
  async getTasks(
    workspaceId: string,
    filters?: TaskFilters
  ): Promise<AgentTask[]> {
    try {
      const conditions: string[] = ['workspace_id = $1'];
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      // Build dynamic WHERE clause based on filters
      if (filters) {
        if (filters.status) {
          if (Array.isArray(filters.status)) {
            conditions.push(`status = ANY($${paramIndex})`);
            params.push(filters.status);
          } else {
            conditions.push(`status = $${paramIndex}`);
            params.push(filters.status);
          }
          paramIndex++;
        }

        if (filters.priority) {
          if (Array.isArray(filters.priority)) {
            conditions.push(`priority = ANY($${paramIndex})`);
            params.push(filters.priority);
          } else {
            conditions.push(`priority = $${paramIndex}`);
            params.push(filters.priority);
          }
          paramIndex++;
        }

        if (filters.taskType) {
          if (Array.isArray(filters.taskType)) {
            conditions.push(`task_type = ANY($${paramIndex})`);
            params.push(filters.taskType);
          } else {
            conditions.push(`task_type = $${paramIndex}`);
            params.push(filters.taskType);
          }
          paramIndex++;
        }

        if (filters.assignedToAgentId !== undefined) {
          if (filters.assignedToAgentId === null) {
            conditions.push('assigned_to_agent_id IS NULL');
          } else {
            conditions.push(`assigned_to_agent_id = $${paramIndex}`);
            params.push(filters.assignedToAgentId);
            paramIndex++;
          }
        }

        if (filters.createdByAgentId) {
          conditions.push(`created_by_agent_id = $${paramIndex}`);
          params.push(filters.createdByAgentId);
          paramIndex++;
        }

        if (filters.assignedToUserId !== undefined) {
          if (filters.assignedToUserId === null) {
            conditions.push('assigned_to_user_id IS NULL');
          } else {
            conditions.push(`assigned_to_user_id = $${paramIndex}`);
            params.push(filters.assignedToUserId);
            paramIndex++;
          }
        }

        if (filters.parentTaskId !== undefined) {
          if (filters.parentTaskId === null) {
            conditions.push('parent_task_id IS NULL');
          } else {
            conditions.push(`parent_task_id = $${paramIndex}`);
            params.push(filters.parentTaskId);
            paramIndex++;
          }
        }

        if (filters.dueBefore) {
          conditions.push(`due_date < $${paramIndex}`);
          params.push(filters.dueBefore);
          paramIndex++;
        }

        if (filters.dueAfter) {
          conditions.push(`due_date > $${paramIndex}`);
          params.push(filters.dueAfter);
          paramIndex++;
        }
      }

      const query = `
        SELECT * FROM agent_tasks
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          CASE priority
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 1
          END DESC,
          created_at DESC
      `;

      const result = await pool.query(query, params);
      return result.rows.map(row => this.mapRowToTask(row));
    } catch (error) {
      logger.error('Error getting tasks', { error, workspaceId, filters });
      throw new Error(`Failed to get tasks: ${error}`);
    }
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    updates: UpdateTaskRequest
  ): Promise<AgentTask> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic UPDATE clause
      if (updates.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.taskType !== undefined) {
        fields.push(`task_type = $${paramIndex++}`);
        values.push(updates.taskType);
      }
      if (updates.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.assignedToAgentId !== undefined) {
        fields.push(`assigned_to_agent_id = $${paramIndex++}`);
        values.push(updates.assignedToAgentId);
      }
      if (updates.assignedToUserId !== undefined) {
        fields.push(`assigned_to_user_id = $${paramIndex++}`);
        values.push(updates.assignedToUserId);
      }
      if (updates.context !== undefined) {
        fields.push(`context = $${paramIndex++}`);
        values.push(JSON.stringify(updates.context));
      }
      if (updates.requirements !== undefined) {
        fields.push(`requirements = $${paramIndex++}`);
        values.push(JSON.stringify(updates.requirements));
      }
      if (updates.results !== undefined) {
        fields.push(`results = $${paramIndex++}`);
        values.push(JSON.stringify(updates.results));
      }
      if (updates.errorLog !== undefined) {
        fields.push(`error_log = $${paramIndex++}`);
        values.push(updates.errorLog);
      }
      if (updates.dueDate !== undefined) {
        fields.push(`due_date = $${paramIndex++}`);
        values.push(updates.dueDate);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(taskId);
      const query = `
        UPDATE agent_tasks
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      await client.query('COMMIT');

      const task = this.mapRowToTask(result.rows[0]);
      logger.info('Task updated', { taskId, updates });

      return task;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating task', { error, taskId, updates });
      throw new Error(`Failed to update task: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete a task (cascades to dependencies and subtasks)
   */
  async deleteTask(taskId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM agent_tasks WHERE id = $1 RETURNING id',
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      await client.query('COMMIT');
      logger.info('Task deleted', { taskId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting task', { error, taskId });
      throw new Error(`Failed to delete task: ${error}`);
    } finally {
      client.release();
    }
  }

  // ============================================
  // TASK ASSIGNMENT
  // ============================================

  /**
   * Assign a task to an agent
   */
  async assignTask(taskId: string, agentId: string): Promise<AgentTask> {
    try {
      // Verify agent exists
      const agentCheck = await pool.query(
        'SELECT id FROM agents WHERE id = $1',
        [agentId]
      );

      if (agentCheck.rows.length === 0) {
        throw new Error('Agent not found');
      }

      const result = await pool.query(
        `UPDATE agent_tasks
         SET assigned_to_agent_id = $1
         WHERE id = $2
         RETURNING *`,
        [agentId, taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = this.mapRowToTask(result.rows[0]);
      logger.info('Task assigned', { taskId, agentId });

      return task;
    } catch (error) {
      logger.error('Error assigning task', { error, taskId, agentId });
      throw new Error(`Failed to assign task: ${error}`);
    }
  }

  /**
   * Unassign a task from an agent
   */
  async unassignTask(taskId: string): Promise<AgentTask> {
    try {
      const result = await pool.query(
        `UPDATE agent_tasks
         SET assigned_to_agent_id = NULL
         WHERE id = $1
         RETURNING *`,
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = this.mapRowToTask(result.rows[0]);
      logger.info('Task unassigned', { taskId });

      return task;
    } catch (error) {
      logger.error('Error unassigning task', { error, taskId });
      throw new Error(`Failed to unassign task: ${error}`);
    }
  }

  /**
   * Get available (unassigned, pending) tasks
   */
  async getAvailableTasks(workspaceId: string): Promise<AgentTask[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM agent_tasks
         WHERE workspace_id = $1
         AND assigned_to_agent_id IS NULL
         AND status = 'pending'
         ORDER BY
           CASE priority
             WHEN 'critical' THEN 4
             WHEN 'high' THEN 3
             WHEN 'medium' THEN 2
             WHEN 'low' THEN 1
           END DESC,
           created_at ASC`,
        [workspaceId]
      );

      return result.rows.map(row => this.mapRowToTask(row));
    } catch (error) {
      logger.error('Error getting available tasks', { error, workspaceId });
      throw new Error(`Failed to get available tasks: ${error}`);
    }
  }

  // ============================================
  // TASK DEPENDENCIES
  // ============================================

  /**
   * Add a dependency between tasks
   */
  async addDependency(
    taskId: string,
    dependsOnTaskId: string,
    type: DependencyType = 'blocks'
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify both tasks exist
      const tasksCheck = await client.query(
        'SELECT id FROM agent_tasks WHERE id = ANY($1)',
        [[taskId, dependsOnTaskId]]
      );

      if (tasksCheck.rows.length !== 2) {
        throw new Error('One or both tasks not found');
      }

      // Check for circular dependency
      const circular = await this.checkCircularDependency(
        client,
        taskId,
        dependsOnTaskId
      );

      if (circular) {
        throw new Error('Circular dependency detected');
      }

      // Insert dependency
      await client.query(
        `INSERT INTO agent_task_dependencies (task_id, depends_on_task_id, dependency_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (task_id, depends_on_task_id) DO NOTHING`,
        [taskId, dependsOnTaskId, type]
      );

      await client.query('COMMIT');
      logger.info('Dependency added', { taskId, dependsOnTaskId, type });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding dependency', {
        error,
        taskId,
        dependsOnTaskId,
        type,
      });
      throw new Error(`Failed to add dependency: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Remove a dependency
   */
  async removeDependency(dependencyId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM agent_task_dependencies WHERE id = $1 RETURNING id',
        [dependencyId]
      );

      if (result.rows.length === 0) {
        throw new Error('Dependency not found');
      }

      logger.info('Dependency removed', { dependencyId });
    } catch (error) {
      logger.error('Error removing dependency', { error, dependencyId });
      throw new Error(`Failed to remove dependency: ${error}`);
    }
  }

  /**
   * Get all dependencies for a task
   */
  async getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM agent_task_dependencies WHERE task_id = $1',
        [taskId]
      );

      return result.rows.map(row => this.mapRowToDependency(row));
    } catch (error) {
      logger.error('Error getting task dependencies', { error, taskId });
      throw new Error(`Failed to get task dependencies: ${error}`);
    }
  }

  /**
   * Check if a task can start (all dependencies completed)
   */
  async canStartTask(taskId: string): Promise<boolean> {
    try {
      // Get all blocking dependencies
      const result = await pool.query(
        `SELECT d.depends_on_task_id, t.status
         FROM agent_task_dependencies d
         JOIN agent_tasks t ON d.depends_on_task_id = t.id
         WHERE d.task_id = $1 AND d.dependency_type = 'blocks'`,
        [taskId]
      );

      // Task can start if it has no blocking dependencies or all are completed
      if (result.rows.length === 0) {
        return true;
      }

      return result.rows.every(row => row.status === 'completed');
    } catch (error) {
      logger.error('Error checking if task can start', { error, taskId });
      throw new Error(`Failed to check if task can start: ${error}`);
    }
  }

  /**
   * Check for circular dependencies (helper function)
   */
  private async checkCircularDependency(
    client: any,
    taskId: string,
    dependsOnTaskId: string
  ): Promise<boolean> {
    // Check if dependsOnTaskId depends on taskId (directly or transitively)
    const result = await client.query(
      `WITH RECURSIVE dep_chain AS (
        SELECT task_id, depends_on_task_id
        FROM agent_task_dependencies
        WHERE task_id = $1

        UNION

        SELECT d.task_id, d.depends_on_task_id
        FROM agent_task_dependencies d
        INNER JOIN dep_chain dc ON d.task_id = dc.depends_on_task_id
      )
      SELECT 1 FROM dep_chain WHERE depends_on_task_id = $2
      LIMIT 1`,
      [dependsOnTaskId, taskId]
    );

    return result.rows.length > 0;
  }

  // ============================================
  // TASK DECOMPOSITION
  // ============================================

  /**
   * Create subtasks for a parent task
   */
  async createSubtasks(
    parentTaskId: string,
    subtasks: CreateTaskRequest[]
  ): Promise<AgentTask[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify parent task exists
      const parentCheck = await client.query(
        'SELECT id, workspace_id FROM agent_tasks WHERE id = $1',
        [parentTaskId]
      );

      if (parentCheck.rows.length === 0) {
        throw new Error('Parent task not found');
      }

      const workspaceId = parentCheck.rows[0].workspace_id;
      const createdSubtasks: AgentTask[] = [];

      for (const subtaskData of subtasks) {
        const result = await client.query(
          `INSERT INTO agent_tasks (
            workspace_id, parent_task_id, title, description, task_type,
            priority, context, requirements, estimated_effort, due_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            workspaceId,
            parentTaskId,
            subtaskData.title,
            subtaskData.description || null,
            subtaskData.taskType || null,
            subtaskData.priority || 'medium',
            JSON.stringify(subtaskData.context || {}),
            JSON.stringify(subtaskData.requirements || []),
            subtaskData.estimatedEffort || null,
            subtaskData.dueDate || null,
          ]
        );

        createdSubtasks.push(this.mapRowToTask(result.rows[0]));
      }

      await client.query('COMMIT');
      logger.info('Subtasks created', {
        parentTaskId,
        count: createdSubtasks.length,
      });

      return createdSubtasks;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating subtasks', { error, parentTaskId });
      throw new Error(`Failed to create subtasks: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get all subtasks for a parent task
   */
  async getSubtasks(parentTaskId: string): Promise<AgentTask[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM agent_tasks
         WHERE parent_task_id = $1
         ORDER BY created_at ASC`,
        [parentTaskId]
      );

      return result.rows.map(row => this.mapRowToTask(row));
    } catch (error) {
      logger.error('Error getting subtasks', { error, parentTaskId });
      throw new Error(`Failed to get subtasks: ${error}`);
    }
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  /**
   * Start a task (set to in_progress)
   */
  async startTask(taskId: string): Promise<AgentTask> {
    try {
      // Check if task can start
      const canStart = await this.canStartTask(taskId);
      if (!canStart) {
        throw new Error('Task has incomplete dependencies');
      }

      const result = await pool.query(
        `UPDATE agent_tasks
         SET status = 'in_progress', started_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = this.mapRowToTask(result.rows[0]);
      logger.info('Task started', { taskId });

      return task;
    } catch (error) {
      logger.error('Error starting task', { error, taskId });
      throw new Error(`Failed to start task: ${error}`);
    }
  }

  /**
   * Complete a task with results
   */
  async completeTask(taskId: string, results: TaskResults): Promise<AgentTask> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE agent_tasks
         SET status = 'completed', results = $1, completed_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(results), taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      await client.query('COMMIT');

      const task = this.mapRowToTask(result.rows[0]);
      logger.info('Task completed', { taskId, results });

      return task;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error completing task', { error, taskId });
      throw new Error(`Failed to complete task: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Fail a task with error message
   */
  async failTask(taskId: string, error: string): Promise<AgentTask> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE agent_tasks
         SET status = 'failed', error_log = $1, completed_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [error, taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      await client.query('COMMIT');

      const task = this.mapRowToTask(result.rows[0]);
      logger.warn('Task failed', { taskId, error });

      return task;
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error failing task', { error: err, taskId });
      throw new Error(`Failed to fail task: ${err}`);
    } finally {
      client.release();
    }
  }

  /**
   * Block a task with reason
   */
  async blockTask(taskId: string, reason: string): Promise<AgentTask> {
    try {
      const result = await pool.query(
        `UPDATE agent_tasks
         SET status = 'blocked', error_log = $1
         WHERE id = $2
         RETURNING *`,
        [reason, taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = this.mapRowToTask(result.rows[0]);
      logger.warn('Task blocked', { taskId, reason });

      return task;
    } catch (error) {
      logger.error('Error blocking task', { error, taskId });
      throw new Error(`Failed to block task: ${error}`);
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<AgentTask> {
    try {
      const result = await pool.query(
        `UPDATE agent_tasks
         SET status = 'cancelled', completed_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [taskId]
      );

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = this.mapRowToTask(result.rows[0]);
      logger.info('Task cancelled', { taskId });

      return task;
    } catch (error) {
      logger.error('Error cancelling task', { error, taskId });
      throw new Error(`Failed to cancel task: ${error}`);
    }
  }

  // ============================================
  // PRIORITY QUEUE
  // ============================================

  /**
   * Get the next available task for an agent based on priority and capabilities
   */
  async getNextTask(
    agentId: string,
    agentCapabilities: string[]
  ): Promise<AgentTask | null> {
    const client = await pool.connect();
    try {
      // Get agent's workspace
      const agentResult = await client.query(
        'SELECT workspace_id FROM agents WHERE id = $1',
        [agentId]
      );

      if (agentResult.rows.length === 0) {
        throw new Error('Agent not found');
      }

      const workspaceId = agentResult.rows[0].workspace_id;

      // Get highest priority available task that:
      // 1. Is in the same workspace
      // 2. Is not assigned
      // 3. Is pending
      // 4. Has no blocking dependencies (or all are completed)
      // 5. Matches agent capabilities (if task_type is specified and agent has capabilities)
      const result = await client.query(
        `WITH available_tasks AS (
          SELECT t.*
          FROM agent_tasks t
          WHERE t.workspace_id = $1
          AND t.assigned_to_agent_id IS NULL
          AND t.status = 'pending'
          AND NOT EXISTS (
            SELECT 1
            FROM agent_task_dependencies d
            JOIN agent_tasks dep ON d.depends_on_task_id = dep.id
            WHERE d.task_id = t.id
            AND d.dependency_type = 'blocks'
            AND dep.status != 'completed'
          )
        )
        SELECT * FROM available_tasks
        WHERE task_type IS NULL OR task_type = ANY($2) OR $2 = '{}'
        ORDER BY
          CASE priority
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 1
          END DESC,
          created_at ASC
        LIMIT 1`,
        [workspaceId, agentCapabilities.length > 0 ? agentCapabilities : []]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const task = this.mapRowToTask(result.rows[0]);

      // Automatically assign the task to the agent
      await client.query(
        'UPDATE agent_tasks SET assigned_to_agent_id = $1 WHERE id = $2',
        [agentId, task.id]
      );

      task.assignedToAgentId = agentId;

      logger.info('Next task retrieved and assigned', { taskId: task.id, agentId });

      return task;
    } catch (error) {
      logger.error('Error getting next task', { error, agentId });
      throw new Error(`Failed to get next task: ${error}`);
    } finally {
      client.release();
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map database row to AgentTask
   */
  private mapRowToTask(row: any): AgentTask {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      createdByAgentId: row.created_by_agent_id,
      assignedToAgentId: row.assigned_to_agent_id,
      assignedToUserId: row.assigned_to_user_id,
      parentTaskId: row.parent_task_id,
      title: row.title,
      description: row.description,
      taskType: row.task_type,
      priority: row.priority as TaskPriority,
      status: row.status as TaskStatus,
      context: row.context || {},
      requirements: row.requirements || [],
      results: row.results || {},
      errorLog: row.error_log,
      estimatedEffort: row.estimated_effort,
      actualEffort: row.actual_effort,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to TaskDependency
   */
  private mapRowToDependency(row: any): TaskDependency {
    return {
      id: row.id,
      taskId: row.task_id,
      dependsOnTaskId: row.depends_on_task_id,
      dependencyType: row.dependency_type as DependencyType,
      createdAt: new Date(row.created_at),
    };
  }

  // ============================================
  // LABEL OPERATIONS
  // ============================================

  /**
   * Get all labels for a task
   */
  async getTaskLabels(taskId: string): Promise<TaskLabel[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM task_labels WHERE task_id = $1 ORDER BY created_at ASC',
        [taskId]
      );

      return result.rows.map(row => this.mapRowToLabel(row));
    } catch (error) {
      logger.error('Error getting task labels', { error, taskId });
      throw new Error(`Failed to get task labels: ${error}`);
    }
  }

  /**
   * Add a label to a task
   */
  async addLabelToTask(
    taskId: string,
    name: string,
    color?: string
  ): Promise<TaskLabel> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify task exists
      const taskCheck = await client.query(
        'SELECT id FROM agent_tasks WHERE id = $1',
        [taskId]
      );

      if (taskCheck.rows.length === 0) {
        throw new Error('Task not found');
      }

      // Insert label
      const result = await client.query(
        `INSERT INTO task_labels (task_id, name, color)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [taskId, name, color || null]
      );

      await client.query('COMMIT');

      const label = this.mapRowToLabel(result.rows[0]);
      logger.info('Label added to task', { taskId, labelId: label.id, name });

      return label;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding label to task', { error, taskId, name });
      throw new Error(`Failed to add label to task: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Remove a label from a task
   */
  async removeLabelFromTask(labelId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM task_labels WHERE id = $1 RETURNING id',
        [labelId]
      );

      if (result.rows.length === 0) {
        throw new Error('Label not found');
      }

      logger.info('Label removed from task', { labelId });
    } catch (error) {
      logger.error('Error removing label from task', { error, labelId });
      throw new Error(`Failed to remove label from task: ${error}`);
    }
  }

  // ============================================
  // COMMENT OPERATIONS
  // ============================================

  /**
   * Get all comments for a task
   */
  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC',
        [taskId]
      );

      return result.rows.map(row => this.mapRowToComment(row));
    } catch (error) {
      logger.error('Error getting task comments', { error, taskId });
      throw new Error(`Failed to get task comments: ${error}`);
    }
  }

  /**
   * Add a comment to a task
   */
  async addComment(
    taskId: string,
    content: string,
    userId?: string,
    agentId?: string
  ): Promise<TaskComment> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify task exists
      const taskCheck = await client.query(
        'SELECT id FROM agent_tasks WHERE id = $1',
        [taskId]
      );

      if (taskCheck.rows.length === 0) {
        throw new Error('Task not found');
      }

      // Insert comment
      const result = await client.query(
        `INSERT INTO task_comments (task_id, user_id, agent_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [taskId, userId || null, agentId || null, content]
      );

      await client.query('COMMIT');

      const comment = this.mapRowToComment(result.rows[0]);
      logger.info('Comment added to task', { taskId, commentId: comment.id });

      return comment;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding comment to task', { error, taskId });
      throw new Error(`Failed to add comment to task: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, content: string): Promise<TaskComment> {
    try {
      const result = await pool.query(
        `UPDATE task_comments
         SET content = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [content, commentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Comment not found');
      }

      const comment = this.mapRowToComment(result.rows[0]);
      logger.info('Comment updated', { commentId });

      return comment;
    } catch (error) {
      logger.error('Error updating comment', { error, commentId });
      throw new Error(`Failed to update comment: ${error}`);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM task_comments WHERE id = $1 RETURNING id',
        [commentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Comment not found');
      }

      logger.info('Comment deleted', { commentId });
    } catch (error) {
      logger.error('Error deleting comment', { error, commentId });
      throw new Error(`Failed to delete comment: ${error}`);
    }
  }

  /**
   * Map database row to TaskLabel
   */
  private mapRowToLabel(row: any): TaskLabel {
    return {
      id: row.id,
      taskId: row.task_id,
      name: row.name,
      color: row.color,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map database row to TaskComment
   */
  private mapRowToComment(row: any): TaskComment {
    return {
      id: row.id,
      taskId: row.task_id,
      userId: row.user_id,
      agentId: row.agent_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new TaskService();
