import { EventEmitter } from 'events';
import { pool } from '../database/db';
import {
  Agent,
  AgentTask,
  AgentStatus,
  AgentType,
  AgentConfiguration,
  AgentMetrics,
  TaskResults,
  CreateArtifactRequest,
} from '../types/agent';

/**
 * Abstract base class for all AI agents in the ChessSlack system.
 * Provides common functionality for task execution, status management,
 * progress reporting, logging, and artifact creation.
 *
 * @abstract
 * @extends EventEmitter
 */
export abstract class BaseAgent extends EventEmitter {
  protected id: string;
  protected workspaceId: string;
  protected name: string;
  protected type: AgentType;
  protected status: AgentStatus;
  protected capabilities: string[];
  protected configuration: AgentConfiguration;
  protected metrics: AgentMetrics;
  protected createdBy: string;
  protected currentTaskId?: string;

  /**
   * Creates a new BaseAgent instance
   *
   * @param agent - The agent data from the database
   */
  constructor(agent: Agent) {
    super();
    this.id = agent.id;
    this.workspaceId = agent.workspaceId;
    this.name = agent.name;
    this.type = agent.type;
    this.status = agent.status;
    this.capabilities = agent.capabilities;
    this.configuration = agent.configuration;
    this.metrics = agent.metrics;
    this.createdBy = agent.createdBy;
  }

  /**
   * Get the agent's ID
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get the agent's workspace ID
   */
  public getWorkspaceId(): string {
    return this.workspaceId;
  }

  /**
   * Get the agent's name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the agent's type
   */
  public getType(): AgentType {
    return this.type;
  }

  /**
   * Get the agent's current status
   */
  public getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get the agent's capabilities
   */
  public getCapabilities(): string[] {
    return this.capabilities;
  }

  /**
   * Get the agent's configuration
   */
  public getConfiguration(): AgentConfiguration {
    return this.configuration;
  }

  /**
   * Get the agent's metrics
   */
  public getMetrics(): AgentMetrics {
    return this.metrics;
  }

  /**
   * Get the current task ID being executed
   */
  public getCurrentTaskId(): string | undefined {
    return this.currentTaskId;
  }

  /**
   * Abstract method to execute a task. Must be implemented by subclasses.
   *
   * @param task - The task to execute
   * @returns Promise resolving to task results
   * @throws Error if task execution fails
   */
  public abstract executeTask(task: AgentTask): Promise<TaskResults>;

  /**
   * Initialize the agent instance.
   * Sets up any necessary resources and updates status to idle.
   *
   * @returns Promise resolving when initialization is complete
   */
  public async initialize(): Promise<void> {
    try {
      await this.log('agent_initialized', { agentName: this.name, agentType: this.type }, true);
      await this.updateStatus('idle');
      this.emit('initialized', { agentId: this.id, name: this.name });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
      await this.log('agent_initialization_failed', { error: errorMessage }, false);
      throw new Error(`Failed to initialize agent ${this.name}: ${errorMessage}`);
    }
  }

  /**
   * Update the agent's status in the database and emit status change event
   *
   * @param status - The new status to set
   * @returns Promise resolving when status is updated
   */
  public async updateStatus(status: AgentStatus): Promise<void> {
    try {
      const oldStatus = this.status;
      this.status = status;

      await pool.query(
        `UPDATE agents
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, this.id]
      );

      await this.log(
        'status_updated',
        { oldStatus, newStatus: status },
        true
      );

      this.emit('statusChanged', {
        agentId: this.id,
        name: this.name,
        status,
        currentTaskId: this.currentTaskId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log('status_update_failed', { status, error: errorMessage }, false);
      throw new Error(`Failed to update status for agent ${this.name}: ${errorMessage}`);
    }
  }

  /**
   * Report progress on a task execution
   *
   * @param taskId - The ID of the task
   * @param progress - Progress percentage (0-100)
   * @param message - Optional progress message
   * @returns Promise resolving when progress is reported
   */
  public async reportProgress(
    taskId: string,
    progress: number,
    message?: string
  ): Promise<void> {
    try {
      // Validate progress value
      const validProgress = Math.max(0, Math.min(100, progress));

      await this.log(
        'progress_reported',
        {
          taskId,
          progress: validProgress,
          message: message || 'Task in progress',
        },
        true
      );

      this.emit('taskProgress', {
        taskId,
        agentId: this.id,
        progress: validProgress,
        message,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to report progress for task ${taskId}:`, errorMessage);
    }
  }

  /**
   * Create an execution log entry for an action performed by the agent
   *
   * @param action - The action performed
   * @param details - Additional details about the action
   * @param success - Whether the action was successful
   * @param output - Optional output from the action
   * @param error - Optional error message if action failed
   * @param durationMs - Optional duration in milliseconds
   * @returns Promise resolving to the log entry ID
   */
  public async log(
    action: string,
    details: any,
    success: boolean,
    output?: string,
    error?: string,
    durationMs?: number
  ): Promise<string> {
    try {
      const result = await pool.query(
        `INSERT INTO agent_execution_logs
         (agent_id, task_id, action, details, success, output, error, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id`,
        [
          this.id,
          this.currentTaskId || null,
          action,
          JSON.stringify(details),
          success,
          output || null,
          error || null,
          durationMs || null,
        ]
      );

      return result.rows[0].id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Failed to create execution log for agent ${this.name}:`, errorMessage);
      throw new Error(`Failed to create execution log: ${errorMessage}`);
    }
  }

  /**
   * Create a project artifact (file, code, documentation, etc.)
   *
   * @param artifact - The artifact data to create
   * @returns Promise resolving to the artifact ID
   */
  public async createArtifact(artifact: CreateArtifactRequest): Promise<string> {
    try {
      const result = await pool.query(
        `INSERT INTO project_artifacts
         (workspace_id, task_id, created_by_agent_id, artifact_type, file_path, content, language, metadata, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', 1, NOW(), NOW())
         RETURNING id`,
        [
          artifact.workspaceId,
          artifact.taskId || this.currentTaskId || null,
          this.id,
          artifact.artifactType || 'code',
          artifact.filePath,
          artifact.content || null,
          artifact.language || null,
          JSON.stringify(artifact.metadata || {}),
        ]
      );

      const artifactId = result.rows[0].id;

      await this.log(
        'artifact_created',
        {
          artifactId,
          artifactType: artifact.artifactType,
          filePath: artifact.filePath,
          language: artifact.language,
        },
        true
      );

      this.emit('artifactCreated', {
        artifactId,
        agentId: this.id,
        filePath: artifact.filePath,
        artifactType: artifact.artifactType,
      });

      return artifactId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log(
        'artifact_creation_failed',
        { filePath: artifact.filePath, error: errorMessage },
        false
      );
      throw new Error(`Failed to create artifact: ${errorMessage}`);
    }
  }

  /**
   * Request a code review for an artifact
   *
   * @param artifactId - The ID of the artifact to review
   * @param reviewerId - The ID of the agent or user to review (can be agent ID or user ID)
   * @returns Promise resolving to the review ID
   */
  public async requestReview(
    artifactId: string,
    reviewerId: string
  ): Promise<string> {
    try {
      // Check if artifact exists
      const artifactResult = await pool.query(
        `SELECT id, workspace_id, file_path FROM project_artifacts WHERE id = $1`,
        [artifactId]
      );

      if (artifactResult.rows.length === 0) {
        throw new Error(`Artifact ${artifactId} not found`);
      }

      const artifact = artifactResult.rows[0];

      // Update artifact status to 'review'
      await pool.query(
        `UPDATE project_artifacts
         SET status = 'review', updated_at = NOW()
         WHERE id = $1`,
        [artifactId]
      );

      // Determine if reviewer is an agent or user
      // Try to find as agent first
      const agentCheck = await pool.query(
        `SELECT id FROM agents WHERE id = $1`,
        [reviewerId]
      );

      const isAgent = agentCheck.rows.length > 0;

      // Create code review entry
      const result = await pool.query(
        `INSERT INTO code_reviews
         (artifact_id, reviewer_agent_id, reviewer_user_id, status, issues, suggestions, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', '[]', '[]', NOW(), NOW())
         RETURNING id`,
        [
          artifactId,
          isAgent ? reviewerId : null,
          isAgent ? null : reviewerId,
        ]
      );

      const reviewId = result.rows[0].id;

      await this.log(
        'review_requested',
        {
          reviewId,
          artifactId,
          reviewerId,
          reviewerType: isAgent ? 'agent' : 'user',
          filePath: artifact.file_path,
        },
        true
      );

      this.emit('reviewRequested', {
        reviewId,
        artifactId,
        reviewerId,
        agentId: this.id,
        filePath: artifact.file_path,
      });

      return reviewId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log(
        'review_request_failed',
        { artifactId, reviewerId, error: errorMessage },
        false
      );
      throw new Error(`Failed to request review: ${errorMessage}`);
    }
  }

  /**
   * Update the agent's current task ID
   *
   * @param taskId - The task ID to set as current, or undefined to clear
   */
  protected setCurrentTaskId(taskId: string | undefined): void {
    this.currentTaskId = taskId;
  }

  /**
   * Update task status in the database
   *
   * @param taskId - The task ID to update
   * @param status - The new status
   * @param results - Optional task results
   * @param errorLog - Optional error message
   * @returns Promise resolving when task is updated
   */
  protected async updateTaskStatus(
    taskId: string,
    status: string,
    results?: TaskResults,
    errorLog?: string
  ): Promise<void> {
    try {
      const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
      const values: any[] = [status];
      let paramIndex = 2;

      if (results) {
        updateFields.push(`results = $${paramIndex}`);
        values.push(JSON.stringify(results));
        paramIndex++;
      }

      if (errorLog) {
        updateFields.push(`error_log = $${paramIndex}`);
        values.push(errorLog);
        paramIndex++;
      }

      values.push(taskId);

      await pool.query(
        `UPDATE agent_tasks
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}`,
        values
      );

      this.emit('taskStatusUpdated', {
        taskId,
        agentId: this.id,
        status,
        results,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update task status: ${errorMessage}`);
    }
  }

  /**
   * Refresh agent metrics from the database
   *
   * @returns Promise resolving when metrics are refreshed
   */
  protected async refreshMetrics(): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT metrics FROM agents WHERE id = $1`,
        [this.id]
      );

      if (result.rows.length > 0) {
        this.metrics = result.rows[0].metrics;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to refresh metrics for agent ${this.name}:`, errorMessage);
    }
  }

  /**
   * Clean up resources and connections when agent is shut down
   *
   * @returns Promise resolving when cleanup is complete
   */
  public async shutdown(): Promise<void> {
    try {
      await this.updateStatus('offline');
      await this.log('agent_shutdown', { agentName: this.name }, true);
      this.removeAllListeners();
      this.emit('shutdown', { agentId: this.id, name: this.name });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error during agent shutdown for ${this.name}:`, errorMessage);
    }
  }
}
