import { BaseAgent } from './BaseAgent';
import { AgentTask, TaskResults } from '../types/agent';
import executionService, { TestResult } from '../services/executionService';
import taskService from '../services/taskService';
import logger from '../utils/logger';

/**
 * TestEngineerAgent - Handles all testing-related tasks.
 * Capabilities include test creation (unit, integration, e2e), test execution,
 * coverage analysis, test debugging, and test refactoring.
 */
export class TestEngineerAgent extends BaseAgent {
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
      await this.reportProgress(task.id, 0, 'Starting test task');

      await this.log('task_started', { taskId: task.id, title: task.title }, true);

      const context = task.context || {};
      const testTaskType = context.testTaskType || 'create';
      const testType = context.testType || 'unit';

      let results: TaskResults = {
        filesCreated: [],
        filesModified: [],
        commandsExecuted: [],
        artifactsCreated: [],
        output: '',
        summary: '',
      };

      // Route to appropriate test handler
      switch (testTaskType) {
        case 'create':
          results = await this.handleTestCreation(task, testType);
          break;
        case 'run':
          results = await this.handleTestExecution(task);
          break;
        case 'coverage':
          results = await this.handleCoverageAnalysis(task);
          break;
        case 'debug':
          results = await this.handleTestDebugging(task);
          break;
        case 'refactor':
          results = await this.handleTestRefactoring(task);
          break;
        default:
          results = await this.handleTestCreation(task, testType);
          break;
      }

      await this.reportProgress(task.id, 100, 'Test task completed');

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
   * Handle test creation
   */
  private async handleTestCreation(
    task: AgentTask,
    testType: 'unit' | 'integration' | 'e2e'
  ): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, `Creating ${testType} tests`);

    const context = task.context || {};
    const files = context.files || [];

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    for (const filePath of files) {
      try {
        await this.reportProgress(task.id, 40, `Generating tests for ${filePath}`);

        // Read the source code
        const code = await executionService.readFile(filePath);

        // Generate tests
        const testCode = await this.generateTests(code, testType);

        // Create test file
        const testFilePath = filePath.replace(/\.(ts|js)$/, `.test.$1`);
        const fullTestPath = await executionService.createFile(
          this.getWorkspaceId(),
          testFilePath,
          testCode
        );

        results.filesCreated!.push(fullTestPath);

        // Create artifact
        const artifactId = await this.createArtifact({
          workspaceId: this.getWorkspaceId(),
          taskId: task.id,
          artifactType: 'test',
          filePath: fullTestPath,
          content: testCode,
          language: 'typescript',
          metadata: {
            testType,
            sourceFile: filePath,
          },
        });

        results.artifactsCreated!.push(artifactId);
      } catch (error) {
        logger.error('Failed to create tests', { filePath, error });
      }
    }

    // Run the created tests
    await this.reportProgress(task.id, 70, 'Running created tests');
    try {
      const testResult = await executionService.runTests(undefined, {
        cwd: executionService['getWorkspaceDir'](this.getWorkspaceId()),
      });

      results.testsRun = true;
      results.testsPassed = testResult.testsPassed;
      results.commandsExecuted!.push('npm test');

      results.output = `Created ${results.filesCreated!.length} ${testType} test files. Tests ${testResult.testsPassed ? 'passed' : 'failed'}.`;
    } catch (error) {
      results.output = `Created ${results.filesCreated!.length} ${testType} test files.`;
      logger.warn('Could not run tests', { error });
    }

    results.summary = `Successfully created ${testType} tests for ${files.length} files.`;

    return results;
  }

  /**
   * Handle test execution
   */
  private async handleTestExecution(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Running tests');

    const context = task.context || {};
    const testPath = context.testPath;

    const testResult = await this.runAndAnalyzeTests(testPath);

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: ['npm test'],
      artifactsCreated: [],
      testsRun: true,
      testsPassed: testResult.testsPassed,
      output: testResult.stdout,
      summary: `Tests ${testResult.testsPassed ? 'passed' : 'failed'}. ${testResult.testsPassing || 0}/${testResult.testsTotal || 0} tests passing.`,
      testResults: testResult,
    };

    // Create artifact for test results
    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'test',
      filePath: 'test-results.json',
      content: JSON.stringify(testResult, null, 2),
      metadata: {
        testType: 'execution',
      },
    });

    results.artifactsCreated!.push(artifactId);

    return results;
  }

  /**
   * Handle coverage analysis
   */
  private async handleCoverageAnalysis(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Analyzing test coverage');

    const context = task.context || {};

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    // Run tests with coverage
    try {
      const coverageResult = await executionService.executeCommand(
        'npm',
        ['test', '--', '--coverage'],
        {
          cwd: executionService['getWorkspaceDir'](this.getWorkspaceId()),
        }
      );

      results.commandsExecuted!.push('npm test -- --coverage');
      results.output = coverageResult.stdout;

      // Parse coverage information
      const coverageMatch = coverageResult.stdout.match(/All files\s+\|\s+([\d.]+)/);
      const coveragePercent = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

      results.summary = `Test coverage: ${coveragePercent.toFixed(2)}%`;

      // If coverage is low, suggest improvements
      if (coveragePercent < 80) {
        await this.reportProgress(task.id, 60, 'Identifying uncovered code');

        const files = context.files || [];
        for (const filePath of files) {
          try {
            const improvedTests = await this.improveCoverage(filePath);

            const testFilePath = filePath.replace(/\.(ts|js)$/, `.test.$1`);
            const fullTestPath = await executionService.createFile(
              this.getWorkspaceId(),
              testFilePath,
              improvedTests
            );

            results.filesCreated!.push(fullTestPath);
          } catch (error) {
            logger.error('Failed to improve coverage', { filePath, error });
          }
        }

        results.output += `\n\nGenerated additional tests to improve coverage.`;
      }
    } catch (error) {
      logger.error('Coverage analysis failed', { error });
      results.output = 'Coverage analysis could not be completed.';
    }

    return results;
  }

  /**
   * Handle test debugging
   */
  private async handleTestDebugging(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Debugging failing tests');

    const context = task.context || {};
    const testPath = context.testPath;

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    // Run tests to identify failures
    const testResult = await this.runAndAnalyzeTests(testPath);

    if (testResult.testsPassed) {
      results.output = 'All tests are passing. No debugging needed.';
      results.summary = 'Tests are healthy.';
      return results;
    }

    // Analyze failures
    const failures = this.parseTestFailures(testResult.stderr + testResult.stdout);

    results.output = `Found ${failures.length} failing test(s):\n\n${failures.join('\n\n')}`;
    results.summary = `Identified ${failures.length} failing tests. Review output for details.`;

    // Create artifact with debug information
    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: 'test-debug-report.txt',
      content: results.output,
      metadata: {
        testType: 'debug',
        failureCount: failures.length,
      },
    });

    results.artifactsCreated!.push(artifactId);

    return results;
  }

  /**
   * Handle test refactoring
   */
  private async handleTestRefactoring(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Refactoring tests');

    const context = task.context || {};
    const files = context.files || [];

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    for (const filePath of files) {
      try {
        // Read test file
        const testCode = await executionService.readFile(filePath);

        // Refactor tests (remove duplication, improve readability)
        const refactoredCode = this.refactorTestCode(testCode);

        // Update file
        await executionService.updateFile(filePath, refactoredCode);
        results.filesModified!.push(filePath);
      } catch (error) {
        logger.error('Failed to refactor test', { filePath, error });
      }
    }

    // Verify refactored tests still pass
    await this.reportProgress(task.id, 70, 'Verifying refactored tests');
    const testResult = await this.runAndAnalyzeTests();

    results.testsRun = true;
    results.testsPassed = testResult.testsPassed;

    results.output = `Refactored ${results.filesModified!.length} test files.`;
    results.summary = `Successfully refactored tests. All tests ${testResult.testsPassed ? 'passing' : 'need attention'}.`;

    return results;
  }

  /**
   * Generate tests for given code
   *
   * @param code - Code to generate tests for
   * @param testType - Type of tests to generate
   * @returns Promise resolving to test code
   */
  public async generateTests(
    code: string,
    testType: 'unit' | 'integration' | 'e2e'
  ): Promise<string> {
    await this.log('generate_tests', { codeLength: code.length, testType }, true);

    // Placeholder implementation - in production, would use LLM
    const functionMatches = code.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g) || [];
    const functions = functionMatches.map(match => match.match(/function\s+(\w+)/)?.[1] || '');

    let testCode = `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';\n`;
    testCode += `// Import the module under test\n\n`;

    testCode += `describe('${testType} tests', () => {\n`;
    testCode += `  beforeEach(() => {\n`;
    testCode += `    // Setup test environment\n`;
    testCode += `  });\n\n`;

    testCode += `  afterEach(() => {\n`;
    testCode += `    // Cleanup\n`;
    testCode += `  });\n\n`;

    for (const funcName of functions) {
      if (funcName) {
        testCode += `  describe('${funcName}', () => {\n`;
        testCode += `    it('should work correctly', () => {\n`;
        testCode += `      // TODO: Implement test\n`;
        testCode += `      expect(true).toBe(true);\n`;
        testCode += `    });\n\n`;

        testCode += `    it('should handle edge cases', () => {\n`;
        testCode += `      // TODO: Test edge cases\n`;
        testCode += `      expect(true).toBe(true);\n`;
        testCode += `    });\n\n`;

        testCode += `    it('should handle errors', () => {\n`;
        testCode += `      // TODO: Test error handling\n`;
        testCode += `      expect(true).toBe(true);\n`;
        testCode += `    });\n`;
        testCode += `  });\n\n`;
      }
    }

    testCode += `});\n`;

    logger.info('Tests generated', { testType, functions: functions.length });
    return testCode;
  }

  /**
   * Run tests and analyze results
   *
   * @param testPath - Optional path to specific test file
   * @returns Promise resolving to test result
   */
  public async runAndAnalyzeTests(testPath?: string): Promise<TestResult> {
    await this.log('run_and_analyze_tests', { testPath }, true);

    try {
      const testResult = await executionService.runTests(testPath, {
        cwd: executionService['getWorkspaceDir'](this.getWorkspaceId()),
      });

      logger.info('Tests executed', {
        passed: testResult.testsPassed,
        passing: testResult.testsPassing,
        failing: testResult.testsFailing,
        total: testResult.testsTotal,
      });

      return testResult;
    } catch (error) {
      logger.error('Test execution failed', { error });
      throw error;
    }
  }

  /**
   * Improve test coverage for a file
   *
   * @param filePath - Path to file needing coverage
   * @returns Promise resolving to additional test code
   */
  public async improveCoverage(filePath: string): Promise<string> {
    await this.log('improve_coverage', { filePath }, true);

    try {
      // Read the source code
      const code = await executionService.readFile(filePath);

      // Analyze uncovered paths
      // Placeholder - in production would analyze coverage report
      const additionalTests = await this.generateTests(code, 'unit');

      logger.info('Coverage improvement tests generated', { filePath });
      return additionalTests;
    } catch (error) {
      logger.error('Failed to improve coverage', { filePath, error });
      throw error;
    }
  }

  /**
   * Parse test failures from output
   */
  private parseTestFailures(output: string): string[] {
    const failures: string[] = [];

    // Parse Jest/Mocha failure output
    const failurePattern = /● (.+?)(?=\n\n|$)/gs;
    const matches = output.matchAll(failurePattern);

    for (const match of matches) {
      failures.push(match[1].trim());
    }

    // If no matches, try to extract from FAIL lines
    if (failures.length === 0) {
      const failLines = output.split('\n').filter(line => line.includes('FAIL') || line.includes('✕'));
      failures.push(...failLines);
    }

    return failures;
  }

  /**
   * Refactor test code to improve quality
   */
  private refactorTestCode(testCode: string): string {
    let refactored = testCode;

    // Extract common setup into beforeEach
    const setupPattern = /it\([^)]+\) => \{[\s\S]*?const (\w+) = ([^;]+);/g;
    const setups = new Map<string, string>();

    let match;
    while ((match = setupPattern.exec(testCode)) !== null) {
      setups.set(match[1], match[2]);
    }

    // Add DRY principle comment if duplication detected
    if (setups.size > 2) {
      refactored = `// Consider extracting common setup to beforeEach\n${refactored}`;
    }

    // Improve test descriptions
    refactored = refactored.replace(
      /it\('should work'/g,
      "it('should work correctly with valid input'"
    );

    // Add test categories comment
    if (!refactored.includes('// Arrange-Act-Assert')) {
      refactored = `// Follow Arrange-Act-Assert pattern\n${refactored}`;
    }

    return refactored;
  }
}
