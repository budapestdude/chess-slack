// Agent System Type Definitions

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

export type DependencyType = 'blocks' | 'related' | 'subtask';

export type ArtifactType = 'code' | 'config' | 'documentation' | 'test' | 'design';

export type ArtifactStatus = 'draft' | 'review' | 'approved' | 'deployed';

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected';

export type ConversationRole = 'agent' | 'user' | 'system';

// Agent Interface
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
  createdAt: Date;
  updatedAt: Date;
}

// Agent Configuration
export interface AgentConfiguration {
  model?: string; // AI model to use (e.g., 'claude-sonnet-4-5')
  maxConcurrentTasks?: number;
  timeout?: number; // Task timeout in milliseconds
  retryAttempts?: number;
  customInstructions?: string;
  [key: string]: any; // Allow additional config options
}

// Agent Metrics
export interface AgentMetrics {
  totalTasks?: number;
  completedTasks?: number;
  failedTasks?: number;
  successRate?: number; // Percentage
  avgEffortMinutes?: number;
  lastUpdated?: Date;
  [key: string]: any; // Allow additional metrics
}

// Agent Task Interface
export interface AgentTask {
  id: string;
  workspaceId: string;
  createdByAgentId?: string;
  assignedToAgentId?: string;
  assignedToUserId?: string;
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
  estimatedEffort?: number; // In minutes
  actualEffort?: number; // In minutes
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Task Context
export interface TaskContext {
  files?: string[]; // Files to modify/create
  dependencies?: string[]; // Package dependencies needed
  relatedTasks?: string[]; // Related task IDs
  instructions?: string;
  codebase?: string; // Path to codebase
  environment?: Record<string, string>; // Environment variables
  [key: string]: any;
}

// Task Results
export interface TaskResults {
  filesCreated?: string[];
  filesModified?: string[];
  filesDeleted?: string[];
  commandsExecuted?: string[];
  testsRun?: boolean;
  testsPassed?: boolean;
  artifactsCreated?: string[]; // Artifact IDs
  output?: string;
  summary?: string;
  [key: string]: any;
}

// Task Dependency
export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: DependencyType;
  createdAt: Date;
}

// Task Label
export interface TaskLabel {
  id: string;
  taskId: string;
  name: string;
  color?: string;
  createdAt: Date;
}

// Task Comment
export interface TaskComment {
  id: string;
  taskId: string;
  userId?: string;
  agentId?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Execution Log
export interface ExecutionLog {
  id: string;
  agentId: string;
  taskId?: string;
  action: string;
  details: Record<string, any>;
  success: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
  createdAt: Date;
}

// Agent Conversation
export interface AgentConversation {
  id: string;
  workspaceId: string;
  taskId?: string;
  channelId?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Conversation Message
export interface ConversationMessage {
  id: string;
  conversationId: string;
  agentId?: string;
  userId?: string;
  role: ConversationRole;
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Project Artifact
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
  createdAt: Date;
  updatedAt: Date;
}

// Code Review
export interface CodeReview {
  id: string;
  artifactId: string;
  reviewerAgentId?: string;
  reviewerUserId?: string;
  status: ReviewStatus;
  comments?: string;
  issues: ReviewIssue[];
  suggestions: ReviewSuggestion[];
  createdAt: Date;
  updatedAt: Date;
}

// Review Issue
export interface ReviewIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  message: string;
  category?: string; // e.g., 'security', 'performance', 'style', 'logic'
}

// Review Suggestion
export interface ReviewSuggestion {
  line?: number;
  message: string;
  suggestedCode?: string;
}

// Agent API Request/Response Types
export interface CreateAgentRequest {
  workspaceId: string;
  name: string;
  type: AgentType;
  description?: string;
  capabilities?: string[];
  configuration?: AgentConfiguration;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: AgentStatus;
  capabilities?: string[];
  configuration?: AgentConfiguration;
}

export interface CreateTaskRequest {
  workspaceId: string;
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
  dueDate?: Date;
  startDate?: Date;
  position?: number;
  project_id?: string;
  section_id?: string;
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
  dueDate?: Date;
  completedAt?: Date;
  startDate?: Date;
  position?: number;
}

export interface CreateArtifactRequest {
  workspaceId: string;
  taskId?: string;
  artifactType?: ArtifactType;
  filePath: string;
  content?: string;
  language?: string;
  metadata?: Record<string, any>;
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  taskType?: TaskType | TaskType[];
  assignedToAgentId?: string;
  assignedToUserId?: string;
  createdByAgentId?: string;
  parentTaskId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

// Agent Action Types (for execution)
export type AgentAction =
  | { type: 'create_file'; filePath: string; content: string }
  | { type: 'modify_file'; filePath: string; changes: string }
  | { type: 'delete_file'; filePath: string }
  | { type: 'run_command'; command: string; args?: string[] }
  | { type: 'run_tests'; testPath?: string }
  | { type: 'create_subtask'; task: CreateTaskRequest }
  | { type: 'request_review'; artifactId: string; reviewerId: string }
  | { type: 'send_message'; conversationId: string; content: string }
  | { type: 'update_status'; status: AgentStatus }
  | { type: 'report_progress'; taskId: string; progress: number; message?: string };

// Task Queue Item (for Bull queue)
export interface TaskQueueItem {
  taskId: string;
  agentId: string;
  priority: number; // Converted priority: critical=4, high=3, medium=2, low=1
  attempts: number;
  maxAttempts: number;
}

// WebSocket Events for Agent System
export interface AgentStatusChangedEvent {
  agentId: string;
  name: string;
  status: AgentStatus;
  currentTaskId?: string;
}

export interface TaskAssignedEvent {
  taskId: string;
  agentId: string;
  taskTitle: string;
}

export interface TaskProgressEvent {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  progress: number; // 0-100
  message?: string;
}

export interface TaskCompletedEvent {
  taskId: string;
  agentId: string;
  status: 'completed' | 'failed';
  results?: TaskResults;
  error?: string;
}

export interface AgentMessageEvent {
  conversationId: string;
  agentId?: string;
  userId?: string;
  content: string;
  role: ConversationRole;
}

export interface AgentErrorEvent {
  agentId: string;
  taskId?: string;
  error: string;
  details?: any;
}
