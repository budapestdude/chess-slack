import { BaseAgent } from './BaseAgent';
import { AgentTask, TaskResults, TaskContext } from '../types/agent';
import executionService from '../services/executionService';
import taskService from '../services/taskService';
import logger from '../utils/logger';

/**
 * GeneralPurposeAgent - The swiss-army-knife agent that can handle most coding tasks.
 * Capabilities include file creation/modification, code refactoring, documentation,
 * bug fixes, and general implementation work.
 */
export class GeneralPurposeAgent extends BaseAgent {
  /**
   * Execute a task assigned to this agent
   *
   * @param task - The task to execute
   * @returns Promise resolving to task results
   */
  public async executeTask(task: AgentTask): Promise<TaskResults> {
    this.setCurrentTaskId(task.id);
    const startTime = Date.now();

    try {
      await this.updateStatus('busy');
      await this.reportProgress(task.id, 0, 'Starting task execution');

      await this.log('task_started', { taskId: task.id, title: task.title }, true);

      // Parse task context and requirements
      const context = task.context || {};
      const taskType = task.taskType || 'feature';
      const instructions = context.instructions || task.description || '';

      let results: TaskResults = {
        filesCreated: [],
        filesModified: [],
        commandsExecuted: [],
        artifactsCreated: [],
        output: '',
        summary: '',
      };

      // Route to appropriate handler based on task type
      switch (taskType) {
        case 'feature':
          results = await this.handleFeatureTask(task, instructions);
          break;
        case 'bug':
          results = await this.handleBugFix(task, instructions);
          break;
        case 'refactor':
          results = await this.handleRefactoring(task, instructions);
          break;
        case 'documentation':
          results = await this.handleDocumentation(task, instructions);
          break;
        default:
          results = await this.handleGeneralTask(task, instructions);
          break;
      }

      await this.reportProgress(task.id, 100, 'Task completed successfully');

      const duration = Date.now() - startTime;
      await this.log(
        'task_completed',
        { taskId: task.id, duration },
        true,
        JSON.stringify(results),
        undefined,
        duration
      );

      await this.updateStatus('idle');
      this.setCurrentTaskId(undefined);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      await this.log(
        'task_failed',
        { taskId: task.id, error: errorMessage },
        false,
        undefined,
        errorMessage,
        duration
      );

      await this.updateStatus('error');
      this.setCurrentTaskId(undefined);

      throw error;
    }
  }

  /**
   * Handle feature development tasks
   */
  private async handleFeatureTask(task: AgentTask, instructions: string): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing feature requirements');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    const context = task.context || {};
    const files = context.files || [];
    const language = context.language || 'typescript';

    // Generate code for the feature
    await this.reportProgress(task.id, 40, 'Generating feature code');
    const code = await this.generateCode(instructions, language);

    // Create files if specified
    if (files.length > 0) {
      await this.reportProgress(task.id, 60, 'Creating files');

      for (const filePath of files) {
        try {
          const fullPath = await executionService.createFile(
            this.getWorkspaceId(),
            filePath,
            code
          );

          results.filesCreated!.push(fullPath);

          // Create artifact for the file
          const artifactId = await this.createArtifact({
            workspaceId: this.getWorkspaceId(),
            taskId: task.id,
            artifactType: 'code',
            filePath: fullPath,
            content: code,
            language: language,
            metadata: {
              taskType: 'feature',
              instructions: instructions,
            },
          });

          results.artifactsCreated!.push(artifactId);
        } catch (error) {
          logger.error('Failed to create file', { filePath, error });
        }
      }
    }

    // Run tests if requested
    if (context.runTests) {
      await this.reportProgress(task.id, 80, 'Running tests');
      const testResult = await executionService.runTests(undefined, {
        cwd: executionService['getWorkspaceDir'](this.getWorkspaceId()),
      });

      results.testsRun = true;
      results.testsPassed = testResult.testsPassed;
      results.commandsExecuted!.push('npm test');
    }

    results.output = `Feature implementation completed. Created ${results.filesCreated!.length} files.`;
    results.summary = `Successfully implemented feature: ${task.title}`;

    return results;
  }

  /**
   * Handle bug fix tasks
   */
  private async handleBugFix(task: AgentTask, instructions: string): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing bug');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    const context = task.context || {};
    const files = context.files || [];

    if (files.length > 0) {
      await this.reportProgress(task.id, 40, 'Applying fixes to files');

      for (const filePath of files) {
        try {
          await this.refactorCode(filePath, instructions);
          results.filesModified!.push(filePath);
        } catch (error) {
          logger.error('Failed to fix file', { filePath, error });
        }
      }
    }

    // Run tests to verify fix
    await this.reportProgress(task.id, 70, 'Verifying fix with tests');
    try {
      const testResult = await executionService.runTests(undefined, {
        cwd: executionService['getWorkspaceDir'](this.getWorkspaceId()),
      });

      results.testsRun = true;
      results.testsPassed = testResult.testsPassed;
      results.commandsExecuted!.push('npm test');
    } catch (error) {
      logger.warn('Tests failed or not available', { error });
    }

    results.output = `Bug fix applied to ${results.filesModified!.length} files.`;
    results.summary = `Successfully fixed bug: ${task.title}`;

    return results;
  }

  /**
   * Handle refactoring tasks
   */
  private async handleRefactoring(task: AgentTask, instructions: string): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing code for refactoring');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    const context = task.context || {};
    const files = context.files || [];

    if (files.length > 0) {
      await this.reportProgress(task.id, 40, 'Refactoring files');

      for (const filePath of files) {
        try {
          await this.refactorCode(filePath, instructions);
          results.filesModified!.push(filePath);
        } catch (error) {
          logger.error('Failed to refactor file', { filePath, error });
        }
      }
    }

    // Validate refactored code
    await this.reportProgress(task.id, 70, 'Validating refactored code');
    try {
      const testResult = await executionService.runTests(undefined, {
        cwd: executionService['getWorkspaceDir'](this.getWorkspaceId()),
      });

      results.testsRun = true;
      results.testsPassed = testResult.testsPassed;
    } catch (error) {
      logger.warn('Validation tests not available', { error });
    }

    results.output = `Refactored ${results.filesModified!.length} files.`;
    results.summary = `Successfully refactored code: ${task.title}`;

    return results;
  }

  /**
   * Handle documentation tasks
   */
  private async handleDocumentation(task: AgentTask, instructions: string): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing code for documentation');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    const context = task.context || {};
    const files = context.files || [];

    if (files.length > 0) {
      await this.reportProgress(task.id, 40, 'Generating documentation');

      for (const filePath of files) {
        try {
          // Read the code
          const code = await executionService.readFile(filePath);

          // Generate documentation
          const documentation = await this.writeDocumentation(code);

          // Create documentation file
          const docFilePath = filePath.replace(/\.(ts|js|py)$/, '.md');
          const fullPath = await executionService.createFile(
            this.getWorkspaceId(),
            docFilePath,
            documentation
          );

          results.filesCreated!.push(fullPath);

          // Create artifact
          const artifactId = await this.createArtifact({
            workspaceId: this.getWorkspaceId(),
            taskId: task.id,
            artifactType: 'documentation',
            filePath: fullPath,
            content: documentation,
            metadata: {
              sourceFile: filePath,
            },
          });

          results.artifactsCreated!.push(artifactId);
        } catch (error) {
          logger.error('Failed to document file', { filePath, error });
        }
      }
    }

    results.output = `Generated documentation for ${results.filesCreated!.length} files.`;
    results.summary = `Successfully created documentation: ${task.title}`;

    return results;
  }

  /**
   * Handle general tasks
   */
  private async handleGeneralTask(task: AgentTask, instructions: string): Promise<TaskResults> {
    await this.reportProgress(task.id, 50, 'Executing general task');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: instructions,
      summary: `Completed general task: ${task.title}`,
    };

    await this.log('general_task_executed', { instructions }, true);

    return results;
  }

  /**
   * Generate code based on description and language
   *
   * @param description - Description of what code should do
   * @param language - Programming language
   * @returns Promise resolving to generated code
   */
  public async generateCode(description: string, language: string): Promise<string> {
    await this.log('generate_code', { description, language }, true);

    // Placeholder implementation - in production, this would call an LLM API
    const templates: Record<string, string> = {
      typescript: `// ${description}\nexport function implementation() {\n  // TODO: Implement functionality\n  console.log('${description}');\n}\n`,
      javascript: `// ${description}\nfunction implementation() {\n  // TODO: Implement functionality\n  console.log('${description}');\n}\n\nmodule.exports = { implementation };\n`,
      python: `# ${description}\ndef implementation():\n    # TODO: Implement functionality\n    print('${description}')\n`,
    };

    const code = templates[language] || templates['typescript'];

    logger.info('Code generated', { language, length: code.length });
    return code;
  }

  /**
   * Refactor existing code based on instructions
   *
   * @param filePath - Path to file to refactor
   * @param instructions - Refactoring instructions
   * @returns Promise resolving when refactoring is complete
   */
  public async refactorCode(filePath: string, instructions: string): Promise<void> {
    await this.log('refactor_code', { filePath, instructions }, true);

    try {
      // Read current code
      const currentCode = await executionService.readFile(filePath);

      // Placeholder refactoring logic - in production, would use LLM
      const refactoredCode = `${currentCode}\n\n// Refactored based on: ${instructions}\n`;

      // Write refactored code
      await executionService.updateFile(filePath, refactoredCode);

      logger.info('Code refactored', { filePath });
    } catch (error) {
      logger.error('Refactoring failed', { filePath, error });
      throw error;
    }
  }

  /**
   * Generate documentation for code
   *
   * @param code - Code to document
   * @returns Promise resolving to generated documentation
   */
  public async writeDocumentation(code: string): Promise<string> {
    await this.log('write_documentation', { codeLength: code.length }, true);

    // Placeholder implementation - in production, would use LLM
    const documentation = `# Documentation

## Overview
This module provides functionality as described in the code.

## Functions
Generated from code analysis.

## Usage Examples
\`\`\`typescript
// Example usage
import { implementation } from './module';
implementation();
\`\`\`

## Code
\`\`\`
${code.slice(0, 500)}${code.length > 500 ? '...' : ''}
\`\`\`
`;

    logger.info('Documentation generated', { length: documentation.length });
    return documentation;
  }
}
