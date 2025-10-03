import { BaseAgent } from './BaseAgent';
import {
  Agent,
  AgentTask,
  TaskResults,
  CreateTaskRequest,
  TaskType,
  TaskPriority,
} from '../types/agent';
import taskService from '../services/taskService';
import agentService from '../services/agentService';
import executionService from '../services/executionService';
import { pool } from '../database/db';

/**
 * Task plan structure returned by createTaskPlan
 */
interface TaskPlan {
  tasks: CreateTaskRequest[];
  dependencies: Array<{ from: number; to: number }>;
}

/**
 * Progress monitoring result
 */
interface ProgressSummary {
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
}

/**
 * Task complexity levels
 */
type TaskComplexity = 'simple' | 'medium' | 'complex';

/**
 * BossAgent - The orchestrator agent that creates plans, coordinates work,
 * and manages other agents in the ChessSlack AI agent system.
 *
 * The BossAgent is responsible for:
 * - Breaking down high-level projects into manageable tasks
 * - Creating detailed task plans with dependencies
 * - Assigning tasks to the most appropriate agents
 * - Monitoring progress across all tasks
 * - Handling blocked tasks and resolving issues
 * - Reviewing and approving code artifacts
 *
 * @extends BaseAgent
 */
export class BossAgent extends BaseAgent {
  /**
   * Creates a new BossAgent instance
   *
   * @param agent - The agent data from the database
   */
  constructor(agent: Agent) {
    super(agent);
  }

  /**
   * Main entry point for task execution.
   * Analyzes the task and decides how to handle it based on its complexity and type.
   *
   * @param task - The task to execute
   * @returns Promise resolving to task results
   * @throws Error if task execution fails
   */
  public async executeTask(task: AgentTask): Promise<TaskResults> {
    const startTime = Date.now();

    try {
      this.setCurrentTaskId(task.id);
      await this.log('task_execution_started', { taskId: task.id, title: task.title }, true);

      // Analyze task complexity
      const complexity = this.analyzeTaskComplexity(task);
      await this.log('task_complexity_analyzed', { taskId: task.id, complexity }, true);

      // Report initial progress
      await this.reportProgress(task.id, 10, 'Analyzing task and creating plan');

      let results: TaskResults;

      // Handle task based on its complexity
      if (complexity === 'simple') {
        // Simple tasks can be handled directly without decomposition
        results = await this.handleSimpleTask(task);
      } else {
        // Medium and complex tasks need to be broken down
        results = await this.handleComplexTask(task);
      }

      // Report completion
      await this.reportProgress(task.id, 100, 'Task execution completed');

      const duration = Date.now() - startTime;
      await this.log('task_execution_completed', { taskId: task.id, duration }, true, undefined, undefined, duration);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      await this.log('task_execution_failed', { taskId: task.id, error: errorMessage }, false, undefined, errorMessage, duration);

      throw new Error(`Failed to execute task: ${errorMessage}`);
    } finally {
      this.setCurrentTaskId(undefined);
    }
  }

  /**
   * Breaks down a high-level project description into tasks.
   * Creates a task hierarchy with dependencies and assigns appropriate types.
   *
   * @param description - High-level project description
   * @param requirements - Array of project requirements
   * @returns Promise resolving to array of created tasks
   */
  public async planProject(description: string, requirements: string[]): Promise<AgentTask[]> {
    try {
      await this.log('project_planning_started', { description, requirementCount: requirements.length }, true);

      // Create task plan
      const plan = await this.createTaskPlan(description);

      // Create all tasks
      const createdTasks: AgentTask[] = [];
      for (const taskRequest of plan.tasks) {
        const task = await taskService.createTask(
          {
            ...taskRequest,
            workspaceId: this.workspaceId,
            requirements: taskRequest.requirements || requirements,
          },
          this.id
        );
        createdTasks.push(task);
      }

      // Add dependencies between tasks
      for (const dep of plan.dependencies) {
        const fromTask = createdTasks[dep.from];
        const toTask = createdTasks[dep.to];
        if (fromTask && toTask) {
          await taskService.addDependency(toTask.id, fromTask.id, 'blocks');
        }
      }

      await this.log('project_planning_completed', { taskCount: createdTasks.length, dependencyCount: plan.dependencies.length }, true);

      return createdTasks;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log('project_planning_failed', { error: errorMessage }, false);
      throw new Error(`Failed to plan project: ${errorMessage}`);
    }
  }

  /**
   * Analyzes a feature/task description and creates detailed subtasks with proper types.
   * Identifies dependencies between subtasks based on common development workflows.
   *
   * @param taskDescription - The description of the task to decompose
   * @returns Promise resolving to task plan with tasks and dependencies
   */
  public async createTaskPlan(taskDescription: string): Promise<TaskPlan> {
    try {
      await this.log('task_plan_creation_started', { taskDescription }, true);

      const tasks: CreateTaskRequest[] = [];
      const dependencies: Array<{ from: number; to: number }> = [];

      // Determine the primary task type
      const primaryType = this.determineTaskType(taskDescription);
      const requirements = this.extractRequirements(taskDescription);

      // Create tasks based on common development workflows
      if (primaryType === 'feature') {
        // Feature workflow: Design → Database → Implementation → Tests → Documentation → Review

        // 1. Design/Planning task
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Design and plan feature architecture',
          description: `Design the architecture and approach for: ${taskDescription}`,
          taskType: 'feature',
          priority: 'high',
          requirements: ['architecture', 'design'],
          estimatedEffort: this.estimateEffort('design and planning'),
        });

        // 2. Database schema (if needed)
        if (this.requiresDatabase(taskDescription)) {
          tasks.push({
            workspaceId: this.workspaceId,
            title: 'Create database schema and migrations',
            description: `Design and implement database schema for: ${taskDescription}`,
            taskType: 'feature',
            priority: 'high',
            requirements: ['database', 'sql', 'migrations'],
            estimatedEffort: this.estimateEffort('database schema'),
          });
          dependencies.push({ from: 0, to: 1 }); // Design blocks database
        }

        // 3. Backend implementation
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Implement backend logic',
          description: `Implement backend API and business logic for: ${taskDescription}`,
          taskType: 'feature',
          priority: 'high',
          requirements: ['backend', 'api', ...requirements],
          estimatedEffort: this.estimateEffort('backend implementation'),
        });
        const backendIndex = tasks.length - 1;
        dependencies.push({ from: 0, to: backendIndex }); // Design blocks backend
        if (this.requiresDatabase(taskDescription)) {
          dependencies.push({ from: 1, to: backendIndex }); // Database blocks backend
        }

        // 4. Frontend/UI implementation (if needed)
        if (this.requiresFrontend(taskDescription)) {
          tasks.push({
            workspaceId: this.workspaceId,
            title: 'Implement frontend components',
            description: `Create UI components for: ${taskDescription}`,
            taskType: 'feature',
            priority: 'high',
            requirements: ['frontend', 'react', 'ui'],
            estimatedEffort: this.estimateEffort('frontend implementation'),
          });
          const frontendIndex = tasks.length - 1;
          dependencies.push({ from: backendIndex, to: frontendIndex }); // Backend blocks frontend
        }

        // 5. Tests
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Write comprehensive tests',
          description: `Create unit and integration tests for: ${taskDescription}`,
          taskType: 'test',
          priority: 'medium',
          requirements: ['testing', 'jest', 'test-coverage'],
          estimatedEffort: this.estimateEffort('testing'),
        });
        const testIndex = tasks.length - 1;
        dependencies.push({ from: backendIndex, to: testIndex }); // Backend blocks tests

        // 6. Documentation
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Update documentation',
          description: `Document the feature, API endpoints, and usage for: ${taskDescription}`,
          taskType: 'documentation',
          priority: 'low',
          requirements: ['documentation', 'markdown'],
          estimatedEffort: this.estimateEffort('documentation'),
        });
        const docIndex = tasks.length - 1;
        dependencies.push({ from: testIndex, to: docIndex }); // Tests block documentation

        // 7. Code review
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Code review and quality check',
          description: `Review all code changes for: ${taskDescription}`,
          taskType: 'review',
          priority: 'high',
          requirements: ['code-review', 'quality-assurance'],
          estimatedEffort: this.estimateEffort('code review'),
        });
        const reviewIndex = tasks.length - 1;
        dependencies.push({ from: docIndex, to: reviewIndex }); // Documentation blocks review
      } else if (primaryType === 'bug') {
        // Bug workflow: Investigation → Fix → Tests → Verification → Documentation

        // 1. Investigation
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Investigate bug and identify root cause',
          description: `Investigate and diagnose: ${taskDescription}`,
          taskType: 'bug',
          priority: 'high',
          requirements: ['debugging', 'investigation'],
          estimatedEffort: this.estimateEffort('bug investigation'),
        });

        // 2. Fix implementation
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Implement bug fix',
          description: `Fix the issue: ${taskDescription}`,
          taskType: 'bug',
          priority: 'high',
          requirements: requirements,
          estimatedEffort: this.estimateEffort('bug fix'),
        });
        dependencies.push({ from: 0, to: 1 }); // Investigation blocks fix

        // 3. Tests
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Write regression tests',
          description: `Create tests to prevent regression of: ${taskDescription}`,
          taskType: 'test',
          priority: 'high',
          requirements: ['testing', 'regression-tests'],
          estimatedEffort: this.estimateEffort('regression testing'),
        });
        dependencies.push({ from: 1, to: 2 }); // Fix blocks tests

        // 4. Verification
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Verify fix in all environments',
          description: `Verify the fix works correctly: ${taskDescription}`,
          taskType: 'review',
          priority: 'high',
          requirements: ['verification', 'qa'],
          estimatedEffort: this.estimateEffort('verification'),
        });
        dependencies.push({ from: 2, to: 3 }); // Tests block verification
      } else if (primaryType === 'refactor') {
        // Refactor workflow: Analysis → Plan → Changes → Tests → Review

        // 1. Code analysis
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Analyze current code structure',
          description: `Analyze code for refactoring: ${taskDescription}`,
          taskType: 'refactor',
          priority: 'medium',
          requirements: ['code-analysis'],
          estimatedEffort: this.estimateEffort('code analysis'),
        });

        // 2. Refactoring plan
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Create refactoring plan',
          description: `Plan refactoring approach for: ${taskDescription}`,
          taskType: 'refactor',
          priority: 'medium',
          requirements: ['planning', 'architecture'],
          estimatedEffort: this.estimateEffort('refactoring plan'),
        });
        dependencies.push({ from: 0, to: 1 }); // Analysis blocks plan

        // 3. Implement changes
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Implement refactoring changes',
          description: `Refactor code: ${taskDescription}`,
          taskType: 'refactor',
          priority: 'medium',
          requirements: requirements,
          estimatedEffort: this.estimateEffort('refactoring implementation'),
        });
        dependencies.push({ from: 1, to: 2 }); // Plan blocks implementation

        // 4. Update tests
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Update and verify tests',
          description: `Ensure all tests pass after refactoring: ${taskDescription}`,
          taskType: 'test',
          priority: 'high',
          requirements: ['testing'],
          estimatedEffort: this.estimateEffort('test updates'),
        });
        dependencies.push({ from: 2, to: 3 }); // Implementation blocks tests

        // 5. Code review
        tasks.push({
          workspaceId: this.workspaceId,
          title: 'Review refactored code',
          description: `Review code changes for: ${taskDescription}`,
          taskType: 'review',
          priority: 'medium',
          requirements: ['code-review'],
          estimatedEffort: this.estimateEffort('code review'),
        });
        dependencies.push({ from: 3, to: 4 }); // Tests block review
      } else {
        // Generic workflow for other task types
        tasks.push({
          workspaceId: this.workspaceId,
          title: taskDescription,
          description: taskDescription,
          taskType: primaryType,
          priority: 'medium',
          requirements: requirements,
          estimatedEffort: this.estimateEffort(taskDescription),
        });
      }

      await this.log('task_plan_created', { taskCount: tasks.length, dependencyCount: dependencies.length }, true);

      return { tasks, dependencies };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log('task_plan_creation_failed', { error: errorMessage }, false);
      throw new Error(`Failed to create task plan: ${errorMessage}`);
    }
  }

  /**
   * Finds the best agent for each task and assigns them in dependency order.
   * Handles cases where no suitable agent exists by logging warnings.
   *
   * @param tasks - Array of tasks to assign
   * @returns Promise resolving when all assignments are complete
   */
  public async assignTasksToAgents(tasks: AgentTask[]): Promise<void> {
    try {
      await this.log('task_assignment_started', { taskCount: tasks.length }, true);

      const assignmentResults: Array<{ taskId: string; agentId: string | null; success: boolean }> = [];

      // Sort tasks by dependencies (tasks with no dependencies first)
      const sortedTasks = await this.sortTasksByDependencies(tasks);

      // Assign each task to the best available agent
      for (const task of sortedTasks) {
        try {
          const bestAgentId = await agentService.findBestAgentForTask(task.id, this.workspaceId);

          if (bestAgentId) {
            await taskService.assignTask(task.id, bestAgentId);
            assignmentResults.push({ taskId: task.id, agentId: bestAgentId, success: true });
            await this.log('task_assigned', { taskId: task.id, agentId: bestAgentId, taskTitle: task.title }, true);
          } else {
            assignmentResults.push({ taskId: task.id, agentId: null, success: false });
            await this.log('no_suitable_agent_found', { taskId: task.id, taskTitle: task.title, taskType: task.taskType }, false);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          assignmentResults.push({ taskId: task.id, agentId: null, success: false });
          await this.log('task_assignment_error', { taskId: task.id, error: errorMessage }, false);
        }
      }

      const successCount = assignmentResults.filter(r => r.success).length;
      await this.log('task_assignment_completed', { total: tasks.length, successful: successCount, failed: tasks.length - successCount }, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log('task_assignment_failed', { error: errorMessage }, false);
      throw new Error(`Failed to assign tasks to agents: ${errorMessage}`);
    }
  }

  /**
   * Monitors all tasks in the workspace and returns a progress summary.
   * Categorizes tasks by their current status.
   *
   * @param workspaceId - The workspace ID to monitor
   * @returns Promise resolving to progress summary
   */
  public async monitorProgress(workspaceId: string): Promise<ProgressSummary> {
    try {
      const tasks = await taskService.getTasks(workspaceId);

      const summary: ProgressSummary = {
        completed: 0,
        inProgress: 0,
        pending: 0,
        blocked: 0,
      };

      for (const task of tasks) {
        switch (task.status) {
          case 'completed':
            summary.completed++;
            break;
          case 'in_progress':
            summary.inProgress++;
            break;
          case 'pending':
            summary.pending++;
            break;
          case 'blocked':
            summary.blocked++;
            break;
        }
      }

      await this.log('progress_monitored', { workspaceId, summary }, true);

      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log('progress_monitoring_failed', { workspaceId, error: errorMessage }, false);
      throw new Error(`Failed to monitor progress: ${errorMessage}`);
    }
  }

  /**
   * Analyzes why a task is blocked and takes corrective action.
   * May reassign the task, break it down further, or escalate the issue.
   *
   * @param taskId - The ID of the blocked task
   * @returns Promise resolving when corrective action is taken
   */
  public async handleBlockedTask(taskId: string): Promise<void> {
    try {
      await this.log('handling_blocked_task', { taskId }, true);

      const task = await taskService.getTask(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check if task has incomplete dependencies
      const canStart = await taskService.canStartTask(taskId);
      if (!canStart) {
        await this.log('task_blocked_by_dependencies', { taskId, reason: 'Waiting on dependencies to complete' }, true);
        // Dependencies are still in progress, no action needed
        return;
      }

      // Check if task has an assigned agent
      if (!task.assignedToAgentId) {
        await this.log('task_blocked_no_agent', { taskId, action: 'Attempting to assign agent' }, true);
        // Try to assign an agent
        const bestAgentId = await agentService.findBestAgentForTask(taskId, this.workspaceId);
        if (bestAgentId) {
          await taskService.assignTask(taskId, bestAgentId);
          await taskService.updateTask(taskId, { status: 'pending' });
          await this.log('blocked_task_assigned', { taskId, agentId: bestAgentId }, true);
          return;
        } else {
          await this.log('blocked_task_no_agent_available', { taskId, action: 'Escalating issue' }, false);
          // No agent available - escalate or create notification
          return;
        }
      }

      // Check agent status
      const agent = await agentService.getAgent(task.assignedToAgentId);
      if (agent && (agent.status === 'error' || agent.status === 'offline')) {
        await this.log('task_blocked_agent_unavailable', { taskId, agentId: agent.id, agentStatus: agent.status, action: 'Reassigning' }, true);
        // Agent is not available, try to reassign
        await taskService.unassignTask(taskId);
        const bestAgentId = await agentService.findBestAgentForTask(taskId, this.workspaceId);
        if (bestAgentId) {
          await taskService.assignTask(taskId, bestAgentId);
          await taskService.updateTask(taskId, { status: 'pending' });
          await this.log('blocked_task_reassigned', { taskId, newAgentId: bestAgentId }, true);
        }
        return;
      }

      // Check task complexity - maybe it needs to be broken down
      const complexity = this.analyzeTaskComplexity(task);
      if (complexity === 'complex') {
        await this.log('task_blocked_too_complex', { taskId, action: 'Breaking down into subtasks' }, true);
        // Create subtasks
        const plan = await this.createTaskPlan(task.description || task.title);
        const subtasks = await taskService.createSubtasks(taskId, plan.tasks);

        // Add dependencies between subtasks
        for (const dep of plan.dependencies) {
          const fromTask = subtasks[dep.from];
          const toTask = subtasks[dep.to];
          if (fromTask && toTask) {
            await taskService.addDependency(toTask.id, fromTask.id, 'blocks');
          }
        }

        // Assign subtasks
        await this.assignTasksToAgents(subtasks);
        await this.log('blocked_task_decomposed', { taskId, subtaskCount: subtasks.length }, true);
        return;
      }

      // If we can't determine the issue, log it for manual review
      await this.log('blocked_task_needs_review', { taskId, errorLog: task.errorLog }, false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log('handle_blocked_task_failed', { taskId, error: errorMessage }, false);
      throw new Error(`Failed to handle blocked task: ${errorMessage}`);
    }
  }

  /**
   * Reviews a code artifact to check if quality standards are met.
   * Creates a code review entry with issues and suggestions.
   *
   * @param artifactId - The ID of the artifact to review
   * @returns Promise resolving to approval status (true if approved, false if changes requested)
   */
  public async reviewAndApprove(artifactId: string): Promise<boolean> {
    try {
      await this.log('artifact_review_started', { artifactId }, true);

      // Get artifact details
      const artifactResult = await pool.query(
        `SELECT id, workspace_id, file_path, content, language, artifact_type, created_by_agent_id
         FROM project_artifacts WHERE id = $1`,
        [artifactId]
      );

      if (artifactResult.rows.length === 0) {
        throw new Error('Artifact not found');
      }

      const artifact = artifactResult.rows[0];
      const content = artifact.content || '';

      // Perform code review checks
      const issues: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; line?: number; message: string; category?: string }> = [];
      const suggestions: Array<{ line?: number; message: string; suggestedCode?: string }> = [];

      // 1. Validate code syntax
      if (artifact.language && content) {
        const validation = await executionService.validateCode(content, artifact.language);
        if (!validation.valid) {
          for (const error of validation.errors) {
            issues.push({
              severity: 'high',
              line: error.line,
              message: error.message,
              category: 'syntax',
            });
          }
        }
      }

      // 2. Check code quality patterns
      const qualityChecks = this.performQualityChecks(content, artifact.language);
      issues.push(...qualityChecks.issues);
      suggestions.push(...qualityChecks.suggestions);

      // 3. Check file structure and naming
      if (artifact.file_path) {
        const structureChecks = this.checkFileStructure(artifact.file_path, artifact.artifact_type);
        suggestions.push(...structureChecks);
      }

      // Determine review status
      const hasCriticalIssues = issues.some(i => i.severity === 'critical' || i.severity === 'high');
      const reviewStatus = hasCriticalIssues ? 'changes_requested' : 'approved';

      // Create code review entry
      const reviewResult = await pool.query(
        `INSERT INTO code_reviews
         (artifact_id, reviewer_agent_id, status, issues, suggestions, comments, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id`,
        [
          artifactId,
          this.id,
          reviewStatus,
          JSON.stringify(issues),
          JSON.stringify(suggestions),
          `Automated review by BossAgent: Found ${issues.length} issues and ${suggestions.length} suggestions.`,
        ]
      );

      const reviewId = reviewResult.rows[0].id;

      // Update artifact status
      await pool.query(
        `UPDATE project_artifacts
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [reviewStatus === 'approved' ? 'approved' : 'review', artifactId]
      );

      await this.log('artifact_review_completed', {
        artifactId,
        reviewId,
        status: reviewStatus,
        issueCount: issues.length,
        suggestionCount: suggestions.length,
      }, true);

      return reviewStatus === 'approved';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.log('artifact_review_failed', { artifactId, error: errorMessage }, false);
      throw new Error(`Failed to review artifact: ${errorMessage}`);
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Analyzes task complexity based on description, requirements, and context.
   *
   * @param task - The task to analyze
   * @returns Task complexity level
   */
  private analyzeTaskComplexity(task: AgentTask): TaskComplexity {
    let complexityScore = 0;

    // Check description length and complexity
    const description = task.description || task.title;
    if (description.length > 200) complexityScore += 2;
    if (description.split(' ').length > 50) complexityScore += 1;

    // Check requirements count
    if (task.requirements.length > 5) complexityScore += 2;
    else if (task.requirements.length > 2) complexityScore += 1;

    // Check for complex keywords
    const complexKeywords = ['integrate', 'refactor', 'migrate', 'architecture', 'system', 'complex', 'multiple'];
    const hasComplexKeywords = complexKeywords.some(keyword =>
      description.toLowerCase().includes(keyword)
    );
    if (hasComplexKeywords) complexityScore += 2;

    // Check task type
    if (task.taskType === 'feature' || task.taskType === 'refactor') complexityScore += 1;

    // Check context
    if (task.context.files && task.context.files.length > 5) complexityScore += 2;
    if (task.context.dependencies && task.context.dependencies.length > 3) complexityScore += 1;

    // Determine complexity level
    if (complexityScore <= 2) return 'simple';
    if (complexityScore <= 5) return 'medium';
    return 'complex';
  }

  /**
   * Estimates effort required for a task in minutes.
   *
   * @param taskDescription - Description of the task
   * @returns Estimated effort in minutes
   */
  private estimateEffort(taskDescription: string): number {
    const description = taskDescription.toLowerCase();

    // Base estimates for common task types
    if (description.includes('design') || description.includes('planning')) return 60;
    if (description.includes('database') || description.includes('schema')) return 90;
    if (description.includes('backend') || description.includes('api')) return 120;
    if (description.includes('frontend') || description.includes('ui')) return 120;
    if (description.includes('testing') || description.includes('test')) return 60;
    if (description.includes('documentation')) return 30;
    if (description.includes('review') || description.includes('code review')) return 45;
    if (description.includes('bug') || description.includes('fix')) return 60;
    if (description.includes('refactor')) return 90;
    if (description.includes('investigation')) return 45;

    // Default estimate
    return 60;
  }

  /**
   * Determines the task type based on description keywords.
   *
   * @param description - Task description
   * @returns Determined task type
   */
  private determineTaskType(description: string): TaskType {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('test') || lowerDesc.includes('testing')) return 'test';
    if (lowerDesc.includes('document') || lowerDesc.includes('readme')) return 'documentation';
    if (lowerDesc.includes('review') || lowerDesc.includes('approve')) return 'review';
    if (lowerDesc.includes('bug') || lowerDesc.includes('fix') || lowerDesc.includes('error')) return 'bug';
    if (lowerDesc.includes('refactor') || lowerDesc.includes('cleanup') || lowerDesc.includes('improve')) return 'refactor';

    // Default to feature
    return 'feature';
  }

  /**
   * Extracts requirements from task description.
   *
   * @param description - Task description
   * @returns Array of extracted requirements
   */
  private extractRequirements(description: string): string[] {
    const requirements: string[] = [];
    const lowerDesc = description.toLowerCase();

    // Technology requirements
    if (lowerDesc.includes('react')) requirements.push('react');
    if (lowerDesc.includes('node') || lowerDesc.includes('express')) requirements.push('nodejs');
    if (lowerDesc.includes('database') || lowerDesc.includes('sql') || lowerDesc.includes('postgres')) requirements.push('database');
    if (lowerDesc.includes('api') || lowerDesc.includes('rest') || lowerDesc.includes('graphql')) requirements.push('api');
    if (lowerDesc.includes('test') || lowerDesc.includes('jest')) requirements.push('testing');
    if (lowerDesc.includes('typescript')) requirements.push('typescript');
    if (lowerDesc.includes('authentication') || lowerDesc.includes('auth')) requirements.push('authentication');
    if (lowerDesc.includes('ui') || lowerDesc.includes('interface')) requirements.push('ui-design');

    return requirements;
  }

  /**
   * Checks if task requires database work.
   *
   * @param description - Task description
   * @returns True if database work is required
   */
  private requiresDatabase(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    const dbKeywords = ['database', 'table', 'schema', 'migration', 'sql', 'query', 'model', 'entity'];
    return dbKeywords.some(keyword => lowerDesc.includes(keyword));
  }

  /**
   * Checks if task requires frontend work.
   *
   * @param description - Task description
   * @returns True if frontend work is required
   */
  private requiresFrontend(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    const frontendKeywords = ['ui', 'interface', 'component', 'react', 'frontend', 'page', 'view', 'display'];
    return frontendKeywords.some(keyword => lowerDesc.includes(keyword));
  }

  /**
   * Handles simple tasks by finding an agent and assigning directly.
   *
   * @param task - The simple task to handle
   * @returns Promise resolving to task results
   */
  private async handleSimpleTask(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Finding suitable agent for task');

    // Find best agent
    const bestAgentId = await agentService.findBestAgentForTask(task.id, this.workspaceId);

    if (!bestAgentId) {
      throw new Error('No suitable agent found for task');
    }

    // Assign task
    await taskService.assignTask(task.id, bestAgentId);
    await this.reportProgress(task.id, 50, 'Task assigned to agent');

    return {
      summary: 'Simple task assigned to appropriate agent',
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      output: `Task assigned to agent ${bestAgentId}`,
    };
  }

  /**
   * Handles complex tasks by breaking them down into subtasks.
   *
   * @param task - The complex task to handle
   * @returns Promise resolving to task results
   */
  private async handleComplexTask(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Creating task decomposition plan');

    // Create task plan
    const plan = await this.createTaskPlan(task.description || task.title);

    await this.reportProgress(task.id, 40, `Created ${plan.tasks.length} subtasks`);

    // Create subtasks
    const subtasks = await taskService.createSubtasks(task.id, plan.tasks);

    await this.reportProgress(task.id, 60, 'Adding task dependencies');

    // Add dependencies
    for (const dep of plan.dependencies) {
      const fromTask = subtasks[dep.from];
      const toTask = subtasks[dep.to];
      if (fromTask && toTask) {
        await taskService.addDependency(toTask.id, fromTask.id, 'blocks');
      }
    }

    await this.reportProgress(task.id, 80, 'Assigning subtasks to agents');

    // Assign subtasks to agents
    await this.assignTasksToAgents(subtasks);

    return {
      summary: `Complex task decomposed into ${subtasks.length} subtasks and assigned to agents`,
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      output: `Created ${subtasks.length} subtasks with ${plan.dependencies.length} dependencies`,
    };
  }

  /**
   * Sorts tasks by their dependencies (tasks with no dependencies first).
   *
   * @param tasks - Array of tasks to sort
   * @returns Promise resolving to sorted tasks array
   */
  private async sortTasksByDependencies(tasks: AgentTask[]): Promise<AgentTask[]> {
    const taskMap = new Map<string, AgentTask>();
    const dependencyCounts = new Map<string, number>();

    // Build task map and initialize dependency counts
    for (const task of tasks) {
      taskMap.set(task.id, task);
      const dependencies = await taskService.getTaskDependencies(task.id);
      dependencyCounts.set(task.id, dependencies.length);
    }

    // Sort by dependency count (ascending)
    return tasks.sort((a, b) => {
      const countA = dependencyCounts.get(a.id) || 0;
      const countB = dependencyCounts.get(b.id) || 0;
      return countA - countB;
    });
  }

  /**
   * Performs quality checks on code content.
   *
   * @param content - Code content to check
   * @param language - Programming language
   * @returns Object with issues and suggestions arrays
   */
  private performQualityChecks(content: string, language: string): {
    issues: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; line?: number; message: string; category?: string }>;
    suggestions: Array<{ line?: number; message: string; suggestedCode?: string }>;
  } {
    const issues: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; line?: number; message: string; category?: string }> = [];
    const suggestions: Array<{ line?: number; message: string; suggestedCode?: string }> = [];

    if (!content) return { issues, suggestions };

    // Check for TODO/FIXME comments
    if (content.includes('TODO') || content.includes('FIXME')) {
      suggestions.push({
        message: 'Code contains TODO or FIXME comments that should be addressed',
      });
    }

    // Check for console.log statements (JavaScript/TypeScript)
    if ((language === 'javascript' || language === 'typescript') && content.includes('console.log')) {
      issues.push({
        severity: 'low',
        message: 'Code contains console.log statements that should be removed or replaced with proper logging',
        category: 'style',
      });
    }

    // Check for long lines
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.length > 120) {
        suggestions.push({
          line: index + 1,
          message: 'Line exceeds 120 characters, consider breaking it up for readability',
        });
      }
    });

    // Check for missing error handling (basic check)
    if (content.includes('await') && !content.includes('try') && !content.includes('catch')) {
      suggestions.push({
        message: 'Async code should have proper error handling with try-catch blocks',
      });
    }

    return { issues, suggestions };
  }

  /**
   * Checks file structure and naming conventions.
   *
   * @param filePath - Path to the file
   * @param artifactType - Type of artifact
   * @returns Array of suggestions
   */
  private checkFileStructure(filePath: string, artifactType: string): Array<{ line?: number; message: string; suggestedCode?: string }> {
    const suggestions: Array<{ line?: number; message: string; suggestedCode?: string }> = [];

    // Check file naming conventions
    const fileName = filePath.split('/').pop() || '';

    // TypeScript files should use PascalCase for classes
    if (fileName.endsWith('.ts') && artifactType === 'code') {
      if (fileName[0] === fileName[0].toLowerCase() && !fileName.includes('.service.') && !fileName.includes('.controller.')) {
        suggestions.push({
          message: 'TypeScript class files should use PascalCase naming (e.g., UserService.ts)',
        });
      }
    }

    // Test files should have .test. or .spec. suffix
    if (artifactType === 'test' && !fileName.includes('.test.') && !fileName.includes('.spec.')) {
      suggestions.push({
        message: 'Test files should use .test.ts or .spec.ts naming convention',
      });
    }

    return suggestions;
  }
}
