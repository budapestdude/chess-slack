# ChessSlack Agent System

The ChessSlack Agent System provides an infrastructure for creating and managing AI-powered agents that can autonomously execute tasks within a workspace.

## Architecture

### BaseAgent (Abstract Class)

The `BaseAgent` class is an abstract base class that all agent types extend. It provides:

- **Core Properties**: id, workspaceId, name, type, status, capabilities, configuration, metrics
- **Status Management**: Update and track agent status (idle, busy, error, offline)
- **Task Execution**: Abstract `executeTask()` method that must be implemented by subclasses
- **Progress Reporting**: Report task progress with percentage and messages
- **Logging**: Comprehensive execution logging to `agent_execution_logs` table
- **Artifact Management**: Create and manage project artifacts (code, docs, configs)
- **Code Review**: Request code reviews for artifacts
- **Event Emission**: Emits events for status changes, progress updates, and other actions

### AgentFactory

The `AgentFactory` class provides factory methods for creating agent instances:

- **createAgent()**: Create a new agent in the database and return an instance
- **loadAgent()**: Load an existing agent from the database by ID
- **loadWorkspaceAgents()**: Load all agents for a workspace
- **createAgentFromData()**: Create an agent instance from database data

## Agent Types

The system supports the following agent types:

1. **boss** - Coordinates work across the team, breaks down tasks, and delegates to specialized agents
2. **code-validator** - Reviews code for quality, security, and best practices
3. **ui-designer** - Creates user interfaces and components
4. **general-purpose** - Handles various coding tasks
5. **database-specialist** - Designs schemas and optimizes queries
6. **test-engineer** - Writes and executes tests

## Usage Example

```typescript
import { AgentFactory } from './agents';
import { AgentTask } from './types/agent';

// Create a new agent
const agent = await AgentFactory.createAgent(
  workspaceId,
  userId,
  'general-purpose',
  'CodeBot 3000',
  'A general-purpose coding agent',
  ['code-generation', 'refactoring'],
  { model: 'claude-sonnet-4-5', maxConcurrentTasks: 2 }
);

// Initialize the agent
await agent.initialize();

// Execute a task
const task: AgentTask = {
  id: 'task-123',
  workspaceId: 'workspace-456',
  title: 'Add user authentication',
  description: 'Implement JWT-based authentication',
  priority: 'high',
  status: 'pending',
  context: {
    files: ['src/auth/auth.service.ts'],
    instructions: 'Use JWT tokens with 24-hour expiration'
  },
  requirements: ['Must include unit tests', 'Must handle errors gracefully'],
  results: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

const results = await agent.executeTask(task);

// Listen to agent events
agent.on('statusChanged', (event) => {
  console.log(`Agent ${event.name} status: ${event.status}`);
});

agent.on('taskProgress', (event) => {
  console.log(`Task ${event.taskId} progress: ${event.progress}%`);
});

agent.on('artifactCreated', (event) => {
  console.log(`Artifact created: ${event.filePath}`);
});

// Shutdown the agent when done
await agent.shutdown();
```

## Implementing Custom Agent Types

To implement a new agent type, extend the `BaseAgent` class:

```typescript
import { BaseAgent } from './BaseAgent';
import { AgentTask, TaskResults } from '../types/agent';

export class GeneralPurposeAgent extends BaseAgent {
  /**
   * Execute a task assigned to this agent
   */
  public async executeTask(task: AgentTask): Promise<TaskResults> {
    try {
      // Set current task and update status
      this.setCurrentTaskId(task.id);
      await this.updateStatus('busy');
      await this.updateTaskStatus(task.id, 'in_progress');

      // Report initial progress
      await this.reportProgress(task.id, 0, 'Starting task execution');

      // TODO: Implement your task execution logic here
      // - Parse task requirements
      // - Generate/modify code
      // - Create artifacts
      // - Run tests
      // - etc.

      const results: TaskResults = {
        filesCreated: [],
        filesModified: [],
        commandsExecuted: [],
        testsRun: true,
        testsPassed: true,
        summary: 'Task completed successfully'
      };

      // Report completion
      await this.reportProgress(task.id, 100, 'Task completed');
      await this.updateTaskStatus(task.id, 'completed', results);
      await this.updateStatus('idle');

      this.setCurrentTaskId(undefined);
      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.log('task_execution_failed', { taskId: task.id, error: errorMessage }, false);
      await this.updateTaskStatus(task.id, 'failed', undefined, errorMessage);
      await this.updateStatus('error');

      this.setCurrentTaskId(undefined);
      throw error;
    }
  }
}
```

Then register it in the `AgentFactory.createAgentFromData()` method:

```typescript
case 'general-purpose':
  return new GeneralPurposeAgent(agent);
```

## Database Schema

The agent system uses the following tables:

- `agents` - Agent definitions and metadata
- `agent_tasks` - Tasks to be executed by agents
- `agent_task_dependencies` - Dependencies between tasks
- `agent_execution_logs` - Audit log of all agent actions
- `agent_conversations` - Conversations between agents and users
- `agent_conversation_messages` - Messages within conversations
- `project_artifacts` - Files and artifacts created by agents
- `code_reviews` - Code reviews performed by agents/users

## Events

The BaseAgent emits the following events:

- **initialized** - Agent has been initialized
- **statusChanged** - Agent status has changed
- **taskProgress** - Task progress update
- **taskStatusUpdated** - Task status has changed
- **artifactCreated** - New artifact has been created
- **reviewRequested** - Code review has been requested
- **shutdown** - Agent is shutting down

## Next Steps

1. Implement concrete agent classes (BossAgent, CodeValidatorAgent, etc.)
2. Add WebSocket integration for real-time updates
3. Integrate with task queue (Bull) for task distribution
4. Add API endpoints for agent management
5. Build agent coordination and communication system
