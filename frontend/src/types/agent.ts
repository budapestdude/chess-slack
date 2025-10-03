// Agent System Type Definitions for Frontend

export type AgentType =
  | 'boss'
  | 'code-validator'
  | 'ui-designer'
  | 'general-purpose'
  | 'database-specialist'
  | 'test-engineer';

export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

export type TaskType = 'feature' | 'bug' | 'refactor' | 'test' | 'documentation' | 'review';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';

export type ArtifactType = 'code' | 'config' | 'documentation' | 'test' | 'design';

export type ArtifactStatus = 'draft' | 'review' | 'approved' | 'deployed';

export interface AgentConfiguration {
  model?: string;
  maxConcurrentTasks?: number;
  timeout?: number;
  retryAttempts?: number;
  customInstructions?: string;
  [key: string]: any;
}

export interface AgentMetrics {
  totalTasks?: number;
  completedTasks?: number;
  failedTasks?: number;
  successRate?: number;
  avgEffortMinutes?: number;
  lastUpdated?: string;
  [key: string]: any;
}

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  type: AgentType;
  description?: string;
  status: AgentStatus;
  capabilities: string[];
  configuration: AgentConfiguration;
  metrics: AgentMetrics;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface TaskContext {
  files?: string[];
  dependencies?: string[];
  relatedTasks?: string[];
  instructions?: string;
  codebase?: string;
  environment?: Record<string, string>;
  [key: string]: any;
}

export interface TaskResults {
  filesCreated?: string[];
  filesModified?: string[];
  filesDeleted?: string[];
  commandsExecuted?: string[];
  testsRun?: boolean;
  testsPassed?: boolean;
  artifactsCreated?: string[];
  output?: string;
  summary?: string;
  [key: string]: any;
}

export interface AgentTask {
  id: string;
  workspaceId: string;
  createdByAgentId?: string;
  assignedToAgentId?: string;
  assignedToUserId?: string;
  assignedUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  parentTaskId?: string;
  title: string;
  description?: string;
  taskType?: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  context: TaskContext;
  requirements: string[];
  results: TaskResults;
  errorLog?: string;
  estimatedEffort?: number;
  actualEffort?: number;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  labels?: TaskLabel[];
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectArtifact {
  id: string;
  workspaceId: string;
  taskId?: string;
  createdByAgentId?: string;
  artifactType?: ArtifactType;
  filePath: string;
  content?: string;
  language?: string;
  version: number;
  status: ArtifactStatus;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRequest {
  name: string;
  type: AgentType;
  description?: string;
  capabilities?: string[];
  configuration?: AgentConfiguration;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  parentTaskId?: string;
  assignedToAgentId?: string;
  assignedToUserId?: string;
  context?: TaskContext;
  requirements?: string[];
  estimatedEffort?: number;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedToAgentId?: string;
  assignedToUserId?: string;
  context?: TaskContext;
  requirements?: string[];
  results?: TaskResults;
  errorLog?: string;
  dueDate?: string;
}

// WebSocket Events
export interface AgentStatusChangedEvent {
  agentId: string;
  name: string;
  status: AgentStatus;
  currentTaskId?: string;
}

export interface TaskProgressEvent {
  taskId: string;
  agentId: string;
  progress: number;
  message?: string;
}

export interface TaskCompletedEvent {
  taskId: string;
  agentId: string;
  status: 'completed' | 'failed';
  results?: TaskResults;
  error?: string;
}
