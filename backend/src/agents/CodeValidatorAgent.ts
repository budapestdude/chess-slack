import { BaseAgent } from './BaseAgent';
import { AgentTask, TaskResults, CodeReview, ReviewIssue, ReviewSuggestion } from '../types/agent';
import executionService from '../services/executionService';
import taskService from '../services/taskService';
import logger from '../utils/logger';

/**
 * CodeValidatorAgent - Focuses on code quality, review, and validation.
 * Capabilities include code review, security scanning, style checking,
 * best practices validation, and performance analysis.
 */
export class CodeValidatorAgent extends BaseAgent {
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
      await this.reportProgress(task.id, 0, 'Starting code validation');

      await this.log('task_started', { taskId: task.id, title: task.title }, true);

      const context = task.context || {};
      const validationType = context.validationType || 'full_review';

      let results: TaskResults = {
        filesCreated: [],
        filesModified: [],
        commandsExecuted: [],
        artifactsCreated: [],
        output: '',
        summary: '',
      };

      // Route to appropriate validation handler
      switch (validationType) {
        case 'code_review':
          results = await this.handleCodeReview(task);
          break;
        case 'security':
          results = await this.handleSecurityScan(task);
          break;
        case 'style':
          results = await this.handleStyleCheck(task);
          break;
        case 'performance':
          results = await this.handlePerformanceAnalysis(task);
          break;
        default:
          results = await this.handleFullReview(task);
          break;
      }

      await this.reportProgress(task.id, 100, 'Validation completed');

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
   * Handle full code review
   */
  private async handleFullReview(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Performing comprehensive code review');

    const context = task.context || {};
    const files = context.files || [];
    const language = context.language || 'typescript';

    const allReviews: CodeReview[] = [];
    const artifacts: string[] = [];

    for (const filePath of files) {
      try {
        const code = await executionService.readFile(filePath);
        const review = await this.reviewCode(code, language);

        allReviews.push(review);

        // Create artifact for review
        const artifactId = await this.createArtifact({
          workspaceId: this.getWorkspaceId(),
          taskId: task.id,
          artifactType: 'documentation',
          filePath: `${filePath}.review.json`,
          content: JSON.stringify(review, null, 2),
          metadata: {
            reviewType: 'full',
            sourceFile: filePath,
          },
        });

        artifacts.push(artifactId);
      } catch (error) {
        logger.error('Failed to review file', { filePath, error });
      }
    }

    await this.reportProgress(task.id, 80, 'Generating review report');

    const totalIssues = allReviews.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = allReviews.reduce(
      (sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length,
      0
    );

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: artifacts,
      output: `Code review completed. Found ${totalIssues} issues (${criticalIssues} critical).`,
      summary: `Reviewed ${files.length} files with ${totalIssues} total issues identified.`,
      reviewResults: allReviews,
    };

    return results;
  }

  /**
   * Handle code review only
   */
  private async handleCodeReview(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Reviewing code quality');

    const context = task.context || {};
    const code = context.code || '';
    const language = context.language || 'typescript';

    const review = await this.reviewCode(code, language);

    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: 'code-review.json',
      content: JSON.stringify(review, null, 2),
      metadata: {
        reviewType: 'code_quality',
      },
    });

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [artifactId],
      output: `Code review completed. Status: ${review.status}`,
      summary: `Found ${review.issues.length} issues and ${review.suggestions.length} suggestions.`,
      reviewResults: [review],
    };

    return results;
  }

  /**
   * Handle security scanning
   */
  private async handleSecurityScan(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Scanning for security vulnerabilities');

    const context = task.context || {};
    const files = context.files || [];

    const allIssues: ReviewIssue[] = [];

    for (const filePath of files) {
      try {
        const code = await executionService.readFile(filePath);
        const issues = await this.checkSecurity(code);
        allIssues.push(...issues);
      } catch (error) {
        logger.error('Failed to scan file', { filePath, error });
      }
    }

    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const highCount = allIssues.filter(i => i.severity === 'high').length;

    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: 'security-scan.json',
      content: JSON.stringify(allIssues, null, 2),
      metadata: {
        scanType: 'security',
        totalIssues: allIssues.length,
        critical: criticalCount,
        high: highCount,
      },
    });

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [artifactId],
      output: `Security scan completed. Found ${allIssues.length} issues (${criticalCount} critical, ${highCount} high).`,
      summary: `Scanned ${files.length} files for security vulnerabilities.`,
      securityIssues: allIssues,
    };

    return results;
  }

  /**
   * Handle style checking
   */
  private async handleStyleCheck(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Checking code style');

    const context = task.context || {};
    const files = context.files || [];
    const language = context.language || 'typescript';

    const allIssues: ReviewIssue[] = [];

    for (const filePath of files) {
      try {
        const code = await executionService.readFile(filePath);
        const issues = await this.checkStyle(code, language);
        allIssues.push(...issues);
      } catch (error) {
        logger.error('Failed to check style', { filePath, error });
      }
    }

    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: 'style-check.json',
      content: JSON.stringify(allIssues, null, 2),
      metadata: {
        checkType: 'style',
        totalIssues: allIssues.length,
      },
    });

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [artifactId],
      output: `Style check completed. Found ${allIssues.length} style issues.`,
      summary: `Checked ${files.length} files for style violations.`,
      styleIssues: allIssues,
    };

    return results;
  }

  /**
   * Handle performance analysis
   */
  private async handlePerformanceAnalysis(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 30, 'Analyzing performance');

    const context = task.context || {};
    const files = context.files || [];
    const language = context.language || 'typescript';

    const suggestions: ReviewSuggestion[] = [];

    for (const filePath of files) {
      try {
        const code = await executionService.readFile(filePath);
        const perfSuggestions = await this.analyzeBestPractices(code, language);
        suggestions.push(...perfSuggestions.filter(s => s.message.includes('performance')));
      } catch (error) {
        logger.error('Failed to analyze performance', { filePath, error });
      }
    }

    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: 'performance-analysis.json',
      content: JSON.stringify(suggestions, null, 2),
      metadata: {
        analysisType: 'performance',
        totalSuggestions: suggestions.length,
      },
    });

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [artifactId],
      output: `Performance analysis completed. Generated ${suggestions.length} suggestions.`,
      summary: `Analyzed ${files.length} files for performance improvements.`,
      performanceSuggestions: suggestions,
    };

    return results;
  }

  /**
   * Perform comprehensive code review
   *
   * @param code - Code to review
   * @param language - Programming language
   * @returns Promise resolving to code review
   */
  public async reviewCode(code: string, language: string): Promise<CodeReview> {
    await this.log('review_code', { codeLength: code.length, language }, true);

    // Placeholder implementation - in production, would use LLM + static analysis tools
    const issues: ReviewIssue[] = [];
    const suggestions: ReviewSuggestion[] = [];

    // Check for common issues
    if (code.includes('console.log')) {
      issues.push({
        severity: 'low',
        message: 'Remove console.log statements before production',
        category: 'style',
      });
    }

    if (code.includes('eval(')) {
      issues.push({
        severity: 'critical',
        message: 'Use of eval() is dangerous and should be avoided',
        category: 'security',
      });
    }

    if (code.includes('// TODO')) {
      issues.push({
        severity: 'medium',
        message: 'Incomplete implementation (TODO found)',
        category: 'logic',
      });
    }

    // Add suggestions
    if (!code.includes('/**')) {
      suggestions.push({
        message: 'Add JSDoc comments for better documentation',
      });
    }

    if (language === 'typescript' && !code.includes(': ')) {
      suggestions.push({
        message: 'Add type annotations for better type safety',
      });
    }

    const review: CodeReview = {
      id: `review-${Date.now()}`,
      artifactId: '',
      reviewerAgentId: this.getId(),
      status: issues.some(i => i.severity === 'critical') ? 'changes_requested' : 'approved',
      issues,
      suggestions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logger.info('Code review completed', {
      issues: issues.length,
      suggestions: suggestions.length,
      status: review.status,
    });

    return review;
  }

  /**
   * Check code for security vulnerabilities
   *
   * @param code - Code to scan
   * @returns Promise resolving to security issues
   */
  public async checkSecurity(code: string): Promise<ReviewIssue[]> {
    await this.log('check_security', { codeLength: code.length }, true);

    const issues: ReviewIssue[] = [];

    // Check for common security vulnerabilities
    const securityPatterns = [
      { pattern: /eval\(/g, message: 'Use of eval() can lead to code injection', severity: 'critical' },
      { pattern: /innerHTML\s*=/g, message: 'innerHTML can lead to XSS attacks', severity: 'high' },
      { pattern: /document\.write/g, message: 'document.write can be exploited', severity: 'high' },
      { pattern: /password\s*=\s*["'][^"']+["']/gi, message: 'Hardcoded password detected', severity: 'critical' },
      { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi, message: 'Hardcoded API key detected', severity: 'critical' },
      { pattern: /exec\(/g, message: 'Command execution can be dangerous', severity: 'high' },
      { pattern: /dangerouslySetInnerHTML/g, message: 'Use dangerouslySetInnerHTML with caution', severity: 'medium' },
    ];

    for (const { pattern, message, severity } of securityPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          severity: severity as 'low' | 'medium' | 'high' | 'critical',
          message: `${message} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
          category: 'security',
        });
      }
    }

    logger.info('Security check completed', { issues: issues.length });
    return issues;
  }

  /**
   * Check code style and formatting
   *
   * @param code - Code to check
   * @param language - Programming language
   * @returns Promise resolving to style issues
   */
  public async checkStyle(code: string, language: string): Promise<ReviewIssue[]> {
    await this.log('check_style', { codeLength: code.length, language }, true);

    const issues: ReviewIssue[] = [];

    // Check for common style issues
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check line length
      if (line.length > 120) {
        issues.push({
          severity: 'low',
          line: index + 1,
          message: 'Line exceeds 120 characters',
          category: 'style',
        });
      }

      // Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        issues.push({
          severity: 'low',
          line: index + 1,
          message: 'Trailing whitespace',
          category: 'style',
        });
      }

      // Check for missing semicolons (JavaScript/TypeScript)
      if ((language === 'javascript' || language === 'typescript') &&
          line.trim().match(/^(let|const|var|return)\s+.+[^;{]$/)) {
        issues.push({
          severity: 'low',
          line: index + 1,
          message: 'Missing semicolon',
          category: 'style',
        });
      }
    });

    // Check indentation consistency
    const tabs = code.match(/^\t/gm)?.length || 0;
    const spaces = code.match(/^  /gm)?.length || 0;
    if (tabs > 0 && spaces > 0) {
      issues.push({
        severity: 'medium',
        message: 'Inconsistent indentation (mixing tabs and spaces)',
        category: 'style',
      });
    }

    logger.info('Style check completed', { issues: issues.length });
    return issues;
  }

  /**
   * Analyze code for best practices
   *
   * @param code - Code to analyze
   * @param language - Programming language
   * @returns Promise resolving to suggestions
   */
  public async analyzeBestPractices(code: string, language: string): Promise<ReviewSuggestion[]> {
    await this.log('analyze_best_practices', { codeLength: code.length, language }, true);

    const suggestions: ReviewSuggestion[] = [];

    // Check for common best practice violations
    if (language === 'typescript' || language === 'javascript') {
      // Check for var usage
      if (code.includes('var ')) {
        suggestions.push({
          message: 'Use const or let instead of var for better scoping',
          suggestedCode: 'Replace var with const or let',
        });
      }

      // Check for == usage
      if (code.includes('==') && !code.includes('===')) {
        suggestions.push({
          message: 'Use strict equality (===) instead of loose equality (==)',
        });
      }

      // Check for performance issues
      if (code.includes('.forEach(') && code.match(/\.forEach\(/g)!.length > 5) {
        suggestions.push({
          message: 'Consider using for...of loops for better performance in large iterations',
        });
      }

      // Check for error handling
      if (code.includes('async ') && !code.includes('try')) {
        suggestions.push({
          message: 'Add error handling (try-catch) for async functions',
        });
      }

      // Check for magic numbers
      const magicNumbers = code.match(/\b\d{2,}\b/g);
      if (magicNumbers && magicNumbers.length > 3) {
        suggestions.push({
          message: 'Extract magic numbers into named constants for better maintainability',
        });
      }
    }

    logger.info('Best practices analysis completed', { suggestions: suggestions.length });
    return suggestions;
  }
}
