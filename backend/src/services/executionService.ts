import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as ivm from 'isolated-vm';
import simpleGit, { SimpleGit } from 'simple-git';
import logger from '../utils/logger';

// Base directory for all agent workspaces
const WORKSPACES_BASE_DIR = '/Users/michaelduke/ChessSlack/agent-workspaces';

// Security constants
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const MAX_TIMEOUT = 300000; // 5 minutes
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
const SANDBOX_MEMORY_LIMIT = 128; // MB
const SANDBOX_TIMEOUT = 30000; // 30 seconds

// Types
export interface ExecutionOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  maxBuffer?: number;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  error?: string;
}

export interface TestResult extends ExecutionResult {
  testsPassed: boolean;
  testsTotal?: number;
  testsPassing?: number;
  testsFailing?: number;
  coverage?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ line: number; message: string }>;
  warnings: Array<{ line: number; message: string }>;
}

/**
 * ExecutionService - Safely executes code, commands, and manages files
 */
class ExecutionService {
  private gitInstances: Map<string, SimpleGit> = new Map();

  constructor() {
    this.ensureWorkspacesBaseDir();
  }

  /**
   * Ensure the workspaces base directory exists
   */
  private async ensureWorkspacesBaseDir(): Promise<void> {
    try {
      await fs.mkdir(WORKSPACES_BASE_DIR, { recursive: true });
      logger.info('Workspaces base directory ensured', { dir: WORKSPACES_BASE_DIR });
    } catch (error) {
      logger.error('Failed to create workspaces base directory', { error });
      throw error;
    }
  }

  /**
   * Get workspace directory path for a given workspace ID
   */
  private getWorkspaceDir(workspaceId: string): string {
    // Sanitize workspace ID to prevent path traversal
    const sanitized = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(WORKSPACES_BASE_DIR, sanitized);
  }

  /**
   * Validate file path is within allowed directories (workspace or temp)
   */
  private validatePath(filePath: string, workspaceId?: string): string {
    const resolved = path.resolve(filePath);

    // Check if path is within workspaces directory
    if (resolved.startsWith(WORKSPACES_BASE_DIR)) {
      return resolved;
    }

    // Check if path is within system temp directory
    if (resolved.startsWith(os.tmpdir())) {
      return resolved;
    }

    // If workspace ID is provided, check if it's within that workspace
    if (workspaceId) {
      const workspaceDir = this.getWorkspaceDir(workspaceId);
      if (resolved.startsWith(workspaceDir)) {
        return resolved;
      }
    }

    logger.error('Path validation failed - outside allowed directories', {
      filePath,
      resolved
    });
    throw new Error('Path is outside allowed directories');
  }

  /**
   * Ensure workspace directory exists
   */
  private async ensureWorkspaceDir(workspaceId: string): Promise<string> {
    const workspaceDir = this.getWorkspaceDir(workspaceId);
    try {
      await fs.mkdir(workspaceDir, { recursive: true });
      logger.debug('Workspace directory ensured', { workspaceId, workspaceDir });
      return workspaceDir;
    } catch (error) {
      logger.error('Failed to create workspace directory', { workspaceId, error });
      throw error;
    }
  }

  // ==================== FILE OPERATIONS ====================

  /**
   * Create a file in the workspace
   */
  async createFile(
    workspaceId: string,
    filePath: string,
    content: string
  ): Promise<string> {
    try {
      const workspaceDir = await this.ensureWorkspaceDir(workspaceId);
      const fullPath = path.join(workspaceDir, filePath);
      const validatedPath = this.validatePath(fullPath, workspaceId);

      // Ensure parent directory exists
      const dirPath = path.dirname(validatedPath);
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(validatedPath, content, 'utf8');

      logger.info('File created', { workspaceId, filePath: validatedPath });
      return validatedPath;
    } catch (error) {
      logger.error('Failed to create file', { workspaceId, filePath, error });
      throw error;
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const validatedPath = this.validatePath(filePath);
      const content = await fs.readFile(validatedPath, 'utf8');
      logger.debug('File read', { filePath: validatedPath });
      return content;
    } catch (error) {
      logger.error('Failed to read file', { filePath, error });
      throw error;
    }
  }

  /**
   * Update file content
   */
  async updateFile(filePath: string, content: string): Promise<void> {
    try {
      const validatedPath = this.validatePath(filePath);
      await fs.writeFile(validatedPath, content, 'utf8');
      logger.info('File updated', { filePath: validatedPath });
    } catch (error) {
      logger.error('Failed to update file', { filePath, error });
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const validatedPath = this.validatePath(filePath);
      await fs.unlink(validatedPath);
      logger.info('File deleted', { filePath: validatedPath });
    } catch (error) {
      logger.error('Failed to delete file', { filePath, error });
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const validatedPath = this.validatePath(filePath);
      await fs.access(validatedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in directory
   */
  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
    try {
      const validatedPath = this.validatePath(dirPath);
      const entries = await fs.readdir(validatedPath, { withFileTypes: true });

      let files = entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(validatedPath, entry.name));

      // Filter by pattern if provided
      if (pattern) {
        const regex = new RegExp(pattern);
        files = files.filter(file => regex.test(path.basename(file)));
      }

      logger.debug('Files listed', { dirPath: validatedPath, count: files.length });
      return files;
    } catch (error) {
      logger.error('Failed to list files', { dirPath, error });
      throw error;
    }
  }

  // ==================== COMMAND EXECUTION ====================

  /**
   * Execute a shell command
   */
  async executeCommand(
    command: string,
    args: string[] = [],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = Math.min(options.timeout || DEFAULT_TIMEOUT, MAX_TIMEOUT);
    const maxBuffer = options.maxBuffer || MAX_BUFFER_SIZE;

    logger.info('Executing command', { command, args, options });

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      const child = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: true,
      });

      // Set timeout
      const timer = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000);
      }, timeout);

      // Collect stdout
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxBuffer) {
          killed = true;
          child.kill('SIGTERM');
        }
      });

      // Collect stderr
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > maxBuffer) {
          killed = true;
          child.kill('SIGTERM');
        }
      });

      // Handle process completion
      child.on('close', (code) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        const result: ExecutionResult = {
          success: code === 0 && !killed,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || (killed ? -1 : 0),
          duration,
          error: killed ? 'Command timed out or exceeded buffer limit' : undefined,
        };

        logger.info('Command execution completed', {
          command,
          exitCode: result.exitCode,
          duration,
          success: result.success,
        });

        resolve(result);
      });

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        logger.error('Command execution failed', { command, error });

        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: -1,
          duration,
          error: error.message,
        });
      });
    });
  }

  /**
   * Execute a script in a specific language
   */
  async executeScript(
    script: string,
    language: 'bash' | 'node' | 'python',
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const interpreters = {
      bash: 'bash',
      node: 'node',
      python: 'python3',
    };

    const interpreter = interpreters[language];
    logger.info('Executing script', { language, scriptLength: script.length });

    // Write script to temp file
    const tmpDir = os.tmpdir();
    const extensions = { bash: 'sh', node: 'js', python: 'py' };
    const tmpFile = path.join(tmpDir, `script-${Date.now()}.${extensions[language]}`);

    try {
      await fs.writeFile(tmpFile, script, 'utf8');
      const result = await this.executeCommand(interpreter, [tmpFile], options);

      // Clean up temp file
      await fs.unlink(tmpFile).catch(() => {});

      return result;
    } catch (error) {
      logger.error('Failed to execute script', { language, error });
      throw error;
    }
  }

  /**
   * Run tests
   */
  async runTests(
    testPath?: string,
    options: ExecutionOptions = {}
  ): Promise<TestResult> {
    logger.info('Running tests', { testPath, options });

    const args = ['test'];
    if (testPath) {
      args.push('--', testPath);
    }

    const result = await this.executeCommand('npm', args, options);

    // Parse test results from output
    const testResult: TestResult = {
      ...result,
      testsPassed: result.success,
    };

    // Try to extract test statistics from Jest/Mocha output
    const output = result.stdout + result.stderr;

    // Jest pattern: "Tests: 5 passed, 5 total"
    const jestMatch = output.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+total)?/);
    if (jestMatch) {
      testResult.testsPassing = parseInt(jestMatch[1], 10);
      testResult.testsFailing = jestMatch[2] ? parseInt(jestMatch[2], 10) : 0;
      testResult.testsTotal = jestMatch[3] ? parseInt(jestMatch[3], 10) : testResult.testsPassing;
    }

    // Mocha pattern: "5 passing"
    const mochaMatch = output.match(/(\d+)\s+passing/);
    if (mochaMatch && !jestMatch) {
      testResult.testsPassing = parseInt(mochaMatch[1], 10);
      testResult.testsTotal = testResult.testsPassing;
      const failMatch = output.match(/(\d+)\s+failing/);
      if (failMatch) {
        testResult.testsFailing = parseInt(failMatch[1], 10);
        testResult.testsTotal += testResult.testsFailing;
      }
    }

    logger.info('Tests completed', {
      testsPassed: testResult.testsPassed,
      testsPassing: testResult.testsPassing,
      testsFailing: testResult.testsFailing,
      testsTotal: testResult.testsTotal,
    });

    return testResult;
  }

  /**
   * Build project
   */
  async buildProject(
    buildCommand?: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const command = buildCommand || 'npm run build';
    logger.info('Building project', { command });

    const [cmd, ...args] = command.split(' ');
    return this.executeCommand(cmd, args, options);
  }

  // ==================== CODE EXECUTION ====================

  /**
   * Execute code in a sandboxed environment using isolated-vm
   */
  async executeSandboxedCode(code: string, timeout: number = SANDBOX_TIMEOUT): Promise<any> {
    logger.info('Executing sandboxed code', { codeLength: code.length, timeout });

    try {
      // Create isolated VM instance
      const isolate = new ivm.Isolate({ memoryLimit: SANDBOX_MEMORY_LIMIT });
      const context = await isolate.createContext();

      // Add console.log support
      const jail = context.global;
      await jail.set('global', jail.derefInto());

      // Create a log collector
      const logs: string[] = [];
      await jail.set('_log', new ivm.Reference((msg: string) => {
        logs.push(msg);
      }));

      await context.eval(`
        global.console = {
          log: (...args) => {
            _log.applySync(undefined, [args.map(a => String(a)).join(' ')]);
          }
        };
      `);

      // Execute the code
      const script = await isolate.compileScript(code);
      const result = await script.run(context, { timeout });

      logger.info('Sandboxed code executed successfully', { logs });

      return {
        success: true,
        result: result,
        logs: logs,
      };
    } catch (error) {
      logger.error('Sandboxed code execution failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs: [],
      };
    }
  }

  /**
   * Validate code syntax
   */
  async validateCode(code: string, language: string): Promise<ValidationResult> {
    logger.debug('Validating code', { language, codeLength: code.length });

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      if (language === 'javascript' || language === 'typescript') {
        // Try to parse JavaScript/TypeScript
        // Note: For production, consider using @typescript-eslint/parser
        try {
          new Function(code);
        } catch (error) {
          if (error instanceof SyntaxError) {
            result.valid = false;
            result.errors.push({
              line: 0,
              message: error.message,
            });
          }
        }
      } else if (language === 'python') {
        // Use Python syntax checker
        const tmpFile = path.join(os.tmpdir(), `validate-${Date.now()}.py`);
        await fs.writeFile(tmpFile, code, 'utf8');

        const checkResult = await this.executeCommand('python3', ['-m', 'py_compile', tmpFile], {
          timeout: 5000,
        });

        await fs.unlink(tmpFile).catch(() => {});

        if (!checkResult.success) {
          result.valid = false;
          result.errors.push({
            line: 0,
            message: checkResult.stderr,
          });
        }
      }

      logger.debug('Code validation completed', { language, valid: result.valid });
    } catch (error) {
      logger.error('Code validation failed', { language, error });
      result.valid = false;
      result.errors.push({
        line: 0,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  // ==================== GIT OPERATIONS ====================

  /**
   * Get or create git instance for workspace
   */
  private getGitInstance(workspaceId: string): SimpleGit {
    const workspaceDir = this.getWorkspaceDir(workspaceId);

    if (!this.gitInstances.has(workspaceId)) {
      const git = simpleGit(workspaceDir);
      this.gitInstances.set(workspaceId, git);
    }

    return this.gitInstances.get(workspaceId)!;
  }

  /**
   * Initialize git repository
   */
  async initGitRepo(workspaceId: string): Promise<void> {
    try {
      await this.ensureWorkspaceDir(workspaceId);
      const git = this.getGitInstance(workspaceId);
      await git.init();

      logger.info('Git repository initialized', { workspaceId });
    } catch (error) {
      logger.error('Failed to initialize git repository', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Stage files for commit
   */
  async gitAdd(workspaceId: string, files: string[]): Promise<void> {
    try {
      const git = this.getGitInstance(workspaceId);
      await git.add(files);

      logger.info('Files staged', { workspaceId, files });
    } catch (error) {
      logger.error('Failed to stage files', { workspaceId, files, error });
      throw error;
    }
  }

  /**
   * Commit changes
   */
  async gitCommit(workspaceId: string, message: string): Promise<void> {
    try {
      const git = this.getGitInstance(workspaceId);
      await git.commit(message);

      logger.info('Changes committed', { workspaceId, message });
    } catch (error) {
      logger.error('Failed to commit changes', { workspaceId, message, error });
      throw error;
    }
  }

  /**
   * Get git status
   */
  async gitStatus(workspaceId: string): Promise<any> {
    try {
      const git = this.getGitInstance(workspaceId);
      const status = await git.status();

      logger.debug('Git status retrieved', { workspaceId });
      return status;
    } catch (error) {
      logger.error('Failed to get git status', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  async gitCreateBranch(workspaceId: string, branchName: string): Promise<void> {
    try {
      const git = this.getGitInstance(workspaceId);
      await git.checkoutLocalBranch(branchName);

      logger.info('Branch created', { workspaceId, branchName });
    } catch (error) {
      logger.error('Failed to create branch', { workspaceId, branchName, error });
      throw error;
    }
  }

  /**
   * Checkout a branch
   */
  async gitCheckout(workspaceId: string, branchName: string): Promise<void> {
    try {
      const git = this.getGitInstance(workspaceId);
      await git.checkout(branchName);

      logger.info('Branch checked out', { workspaceId, branchName });
    } catch (error) {
      logger.error('Failed to checkout branch', { workspaceId, branchName, error });
      throw error;
    }
  }

  /**
   * Cleanup - clear git instances cache
   */
  clearGitCache(): void {
    this.gitInstances.clear();
    logger.debug('Git cache cleared');
  }
}

// Export singleton instance
export default new ExecutionService();
