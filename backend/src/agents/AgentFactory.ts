import { BaseAgent } from './BaseAgent';
import { Agent, AgentType, AgentConfiguration } from '../types/agent';
import { pool } from '../database/db';
import { BossAgent } from './BossAgent';
import { GeneralPurposeAgent } from './GeneralPurposeAgent';
import { CodeValidatorAgent } from './CodeValidatorAgent';
import { UIDesignerAgent } from './UIDesignerAgent';
import { TestEngineerAgent } from './TestEngineerAgent';
import { DatabaseSpecialistAgent } from './DatabaseSpecialistAgent';

/**
 * Factory class for creating agent instances.
 * Handles the instantiation of different agent types and provides
 * a unified interface for agent creation.
 */
export class AgentFactory {
  /**
   * Create an agent instance from database data
   *
   * @param agent - The agent data from the database
   * @returns A concrete agent instance extending BaseAgent
   * @throws Error if agent type is not supported
   */
  public static createAgentFromData(agent: Agent): BaseAgent {
    switch (agent.type) {
      case 'boss':
        return new BossAgent(agent);

      case 'code-validator':
        return new CodeValidatorAgent(agent);

      case 'ui-designer':
        return new UIDesignerAgent(agent);

      case 'general-purpose':
        return new GeneralPurposeAgent(agent);

      case 'database-specialist':
        return new DatabaseSpecialistAgent(agent);

      case 'test-engineer':
        return new TestEngineerAgent(agent);

      default:
        throw new Error(`Unsupported agent type: ${agent.type}`);
    }
  }

  /**
   * Create a new agent in the database and return an instance
   *
   * @param workspaceId - The workspace ID where the agent will be created
   * @param userId - The user ID creating the agent
   * @param type - The type of agent to create
   * @param name - The name of the agent
   * @param description - Optional description of the agent
   * @param capabilities - Optional array of capability strings
   * @param configuration - Optional agent configuration
   * @returns Promise resolving to the created agent instance
   * @throws Error if agent creation fails
   */
  public static async createAgent(
    workspaceId: string,
    userId: string,
    type: AgentType,
    name: string,
    description?: string,
    capabilities?: string[],
    configuration?: AgentConfiguration
  ): Promise<BaseAgent> {
    try {
      // Set default capabilities based on agent type if not provided
      const defaultCapabilities = this.getDefaultCapabilities(type);
      const agentCapabilities = capabilities || defaultCapabilities;

      // Set default configuration if not provided
      const defaultConfig = this.getDefaultConfiguration(type);
      const agentConfiguration = { ...defaultConfig, ...configuration };

      // Initialize metrics
      const initialMetrics = {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        successRate: 0,
        avgEffortMinutes: 0,
        lastUpdated: new Date(),
      };

      // Insert agent into database
      const result = await pool.query(
        `INSERT INTO agents
         (workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'offline', $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at`,
        [
          workspaceId,
          name,
          type,
          description || null,
          JSON.stringify(agentCapabilities),
          JSON.stringify(agentConfiguration),
          JSON.stringify(initialMetrics),
          userId,
        ]
      );

      const agentData: Agent = {
        id: result.rows[0].id,
        workspaceId: result.rows[0].workspace_id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        description: result.rows[0].description,
        status: result.rows[0].status,
        capabilities: result.rows[0].capabilities,
        configuration: result.rows[0].configuration,
        metrics: result.rows[0].metrics,
        createdBy: result.rows[0].created_by,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      // Create and return agent instance
      return this.createAgentFromData(agentData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create agent: ${errorMessage}`);
    }
  }

  /**
   * Load an existing agent from the database by ID
   *
   * @param agentId - The ID of the agent to load
   * @returns Promise resolving to the agent instance
   * @throws Error if agent not found or loading fails
   */
  public static async loadAgent(agentId: string): Promise<BaseAgent> {
    try {
      const result = await pool.query(
        `SELECT id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at
         FROM agents
         WHERE id = $1`,
        [agentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }

      const agentData: Agent = {
        id: result.rows[0].id,
        workspaceId: result.rows[0].workspace_id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        description: result.rows[0].description,
        status: result.rows[0].status,
        capabilities: result.rows[0].capabilities,
        configuration: result.rows[0].configuration,
        metrics: result.rows[0].metrics,
        createdBy: result.rows[0].created_by,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      return this.createAgentFromData(agentData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load agent: ${errorMessage}`);
    }
  }

  /**
   * Load all agents for a workspace
   *
   * @param workspaceId - The workspace ID
   * @returns Promise resolving to an array of agent instances
   */
  public static async loadWorkspaceAgents(workspaceId: string): Promise<BaseAgent[]> {
    try {
      const result = await pool.query(
        `SELECT id, workspace_id, name, type, description, status, capabilities, configuration, metrics, created_by, created_at, updated_at
         FROM agents
         WHERE workspace_id = $1
         ORDER BY created_at DESC`,
        [workspaceId]
      );

      const agents: BaseAgent[] = [];

      for (const row of result.rows) {
        try {
          const agentData: Agent = {
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
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };

          agents.push(this.createAgentFromData(agentData));
        } catch (error) {
          // Log error but continue loading other agents
          console.error(`Failed to create agent instance for ${row.name}:`, error);
        }
      }

      return agents;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load workspace agents: ${errorMessage}`);
    }
  }

  /**
   * Get default capabilities for an agent type
   *
   * @param type - The agent type
   * @returns Array of default capability strings
   */
  private static getDefaultCapabilities(type: AgentType): string[] {
    switch (type) {
      case 'boss':
        return [
          'task-planning',
          'task-delegation',
          'task-coordination',
          'progress-monitoring',
          'team-management',
        ];

      case 'code-validator':
        return [
          'code-review',
          'static-analysis',
          'security-scanning',
          'style-checking',
          'best-practices-validation',
        ];

      case 'ui-designer':
        return [
          'ui-design',
          'component-creation',
          'styling',
          'responsive-design',
          'accessibility-review',
        ];

      case 'general-purpose':
        return [
          'code-generation',
          'file-manipulation',
          'refactoring',
          'documentation',
          'debugging',
        ];

      case 'database-specialist':
        return [
          'schema-design',
          'query-optimization',
          'migration-creation',
          'data-modeling',
          'performance-tuning',
        ];

      case 'test-engineer':
        return [
          'test-writing',
          'test-execution',
          'coverage-analysis',
          'integration-testing',
          'e2e-testing',
        ];

      default:
        return [];
    }
  }

  /**
   * Get default configuration for an agent type
   *
   * @param type - The agent type
   * @returns Default configuration object
   */
  private static getDefaultConfiguration(type: AgentType): AgentConfiguration {
    const baseConfig: AgentConfiguration = {
      model: 'claude-sonnet-4-5',
      maxConcurrentTasks: 1,
      timeout: 600000, // 10 minutes
      retryAttempts: 3,
    };

    switch (type) {
      case 'boss':
        return {
          ...baseConfig,
          maxConcurrentTasks: 5, // Boss can manage multiple tasks
          customInstructions: 'You are the Boss Agent responsible for coordinating work across the team. Break down complex tasks into manageable subtasks and delegate to appropriate specialized agents.',
        };

      case 'code-validator':
        return {
          ...baseConfig,
          timeout: 300000, // 5 minutes for reviews
          customInstructions: 'You are the Code Validator Agent. Review code for quality, security, performance, and best practices. Provide actionable feedback.',
        };

      case 'ui-designer':
        return {
          ...baseConfig,
          customInstructions: 'You are the UI Designer Agent. Create beautiful, accessible, and responsive user interfaces following modern design principles.',
        };

      case 'general-purpose':
        return {
          ...baseConfig,
          maxConcurrentTasks: 2,
          customInstructions: 'You are a General Purpose Agent capable of handling various coding tasks including feature development, refactoring, and documentation.',
        };

      case 'database-specialist':
        return {
          ...baseConfig,
          customInstructions: 'You are the Database Specialist Agent. Design efficient schemas, write optimized queries, and ensure data integrity.',
        };

      case 'test-engineer':
        return {
          ...baseConfig,
          customInstructions: 'You are the Test Engineer Agent. Write comprehensive tests, ensure high coverage, and validate functionality.',
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Validate agent configuration
   *
   * @param configuration - The configuration to validate
   * @returns True if valid
   * @throws Error if configuration is invalid
   */
  public static validateConfiguration(configuration: AgentConfiguration): boolean {
    if (configuration.maxConcurrentTasks !== undefined) {
      if (configuration.maxConcurrentTasks < 1 || configuration.maxConcurrentTasks > 10) {
        throw new Error('maxConcurrentTasks must be between 1 and 10');
      }
    }

    if (configuration.timeout !== undefined) {
      if (configuration.timeout < 1000 || configuration.timeout > 3600000) {
        throw new Error('timeout must be between 1000ms (1s) and 3600000ms (1h)');
      }
    }

    if (configuration.retryAttempts !== undefined) {
      if (configuration.retryAttempts < 0 || configuration.retryAttempts > 5) {
        throw new Error('retryAttempts must be between 0 and 5');
      }
    }

    return true;
  }
}
