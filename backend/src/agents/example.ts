/**
 * Example Agent Implementation
 *
 * This file demonstrates how to create a concrete agent class
 * extending BaseAgent and integrate it with the AgentFactory.
 */

import { BaseAgent } from './BaseAgent';
import { AgentTask, TaskResults, Agent } from '../types/agent';

/**
 * Example: General Purpose Agent
 *
 * This agent can handle various coding tasks including:
 * - Code generation
 * - File manipulation
 * - Refactoring
 * - Documentation
 */
export class GeneralPurposeAgent extends BaseAgent {
  constructor(agent: Agent) {
    super(agent);
  }

  /**
   * Execute a task assigned to this agent.
   * This is a basic implementation that should be expanded based on requirements.
   */
  public async executeTask(task: AgentTask): Promise<TaskResults> {
    const startTime = Date.now();

    try {
      // Set current task and update status
      this.setCurrentTaskId(task.id);
      await this.updateStatus('busy');
      await this.updateTaskStatus(task.id, 'in_progress');
      await this.reportProgress(task.id, 0, 'Starting task execution');

      // Log task start
      await this.log(
        'task_started',
        {
          taskId: task.id,
          taskTitle: task.title,
          taskType: task.taskType,
          priority: task.priority,
        },
        true
      );

      // Parse task context and requirements
      const { files = [], dependencies = [], instructions = '' } = task.context || {};
      const requirements = task.requirements || [];

      await this.reportProgress(
        task.id,
        10,
        `Analyzing task: ${requirements.length} requirements, ${files.length} files`
      );

      // Initialize results
      const results: TaskResults = {
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        commandsExecuted: [],
        testsRun: false,
        testsPassed: false,
        artifactsCreated: [],
        summary: '',
      };

      // Simulate task execution phases
      // In a real implementation, this would:
      // 1. Analyze the task requirements
      // 2. Generate or modify code using AI (Claude API)
      // 3. Create/modify files
      // 4. Run tests
      // 5. Validate results

      // Phase 1: Planning (10-30%)
      await this.reportProgress(task.id, 20, 'Creating execution plan');
      await this.log('planning', { files, instructions }, true);

      // Phase 2: Implementation (30-70%)
      await this.reportProgress(task.id, 40, 'Implementing changes');

      // Example: Create an artifact for each file in the task context
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await this.reportProgress(
          task.id,
          40 + (30 / files.length) * (i + 1),
          `Processing ${file}`
        );

        // In real implementation, would generate actual code content
        const artifactId = await this.createArtifact({
          workspaceId: this.workspaceId,
          taskId: task.id,
          artifactType: 'code',
          filePath: file,
          content: `// Generated code for ${file}\n// TODO: Implement actual logic\n`,
          language: this.detectLanguage(file),
          metadata: {
            generatedBy: this.name,
            generatedAt: new Date().toISOString(),
          },
        });

        results.artifactsCreated?.push(artifactId);
        results.filesModified?.push(file);
      }

      // Phase 3: Testing (70-90%)
      await this.reportProgress(task.id, 80, 'Running tests');
      results.testsRun = true;
      results.testsPassed = true; // In real implementation, run actual tests

      await this.log(
        'tests_executed',
        {
          testsRun: results.testsRun,
          testsPassed: results.testsPassed,
        },
        true
      );

      // Phase 4: Finalization (90-100%)
      await this.reportProgress(task.id, 95, 'Finalizing task');

      // Build summary
      results.summary = this.buildTaskSummary(task, results);
      results.output = `Successfully completed task: ${task.title}`;

      // Complete the task
      const duration = Date.now() - startTime;
      await this.log(
        'task_completed',
        {
          taskId: task.id,
          duration,
          filesModified: results.filesModified?.length || 0,
          artifactsCreated: results.artifactsCreated?.length || 0,
        },
        true,
        results.summary,
        undefined,
        duration
      );

      await this.reportProgress(task.id, 100, 'Task completed successfully');
      await this.updateTaskStatus(task.id, 'completed', results);
      await this.updateStatus('idle');
      await this.refreshMetrics();

      this.setCurrentTaskId(undefined);
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.log(
        'task_execution_failed',
        {
          taskId: task.id,
          error: errorMessage,
          duration,
        },
        false,
        undefined,
        errorMessage,
        duration
      );

      await this.reportProgress(task.id, 100, `Task failed: ${errorMessage}`);
      await this.updateTaskStatus(task.id, 'failed', undefined, errorMessage);
      await this.updateStatus('error');

      this.setCurrentTaskId(undefined);
      throw new Error(`Task execution failed: ${errorMessage}`);
    }
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp',
      c: 'c',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      sql: 'sql',
      css: 'css',
      scss: 'scss',
      html: 'html',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
    };
    return languageMap[ext] || 'text';
  }

  /**
   * Build a task summary
   */
  private buildTaskSummary(task: AgentTask, results: TaskResults): string {
    const parts = [
      `Task: ${task.title}`,
      `Type: ${task.taskType || 'general'}`,
      `Priority: ${task.priority}`,
      '',
      'Results:',
      `- Files modified: ${results.filesModified?.length || 0}`,
      `- Files created: ${results.filesCreated?.length || 0}`,
      `- Artifacts created: ${results.artifactsCreated?.length || 0}`,
      `- Tests passed: ${results.testsPassed ? 'Yes' : 'No'}`,
    ];

    if (results.commandsExecuted && results.commandsExecuted.length > 0) {
      parts.push(`- Commands executed: ${results.commandsExecuted.length}`);
    }

    return parts.join('\n');
  }
}

/**
 * Example Usage:
 *
 * // Register this agent in AgentFactory.createAgentFromData():
 * case 'general-purpose':
 *   return new GeneralPurposeAgent(agent);
 *
 * // Then use it:
 * const agent = await AgentFactory.createAgent(
 *   workspaceId,
 *   userId,
 *   'general-purpose',
 *   'DevBot',
 *   'General purpose development agent'
 * );
 *
 * await agent.initialize();
 *
 * const task = {
 *   id: 'task-123',
 *   workspaceId,
 *   title: 'Implement user login',
 *   priority: 'high',
 *   status: 'pending',
 *   context: {
 *     files: ['src/auth/login.ts'],
 *     instructions: 'Add JWT authentication'
 *   },
 *   requirements: ['Must validate credentials', 'Must return JWT token'],
 *   results: {},
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * };
 *
 * const results = await agent.executeTask(task);
 * console.log('Task completed:', results.summary);
 */
