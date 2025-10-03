// Analytics Types
// Types for the Dashboard and Analytics System

// ============================================
// ENUMS
// ============================================

export type ActivityType =
  | 'message_sent'
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'document_created'
  | 'document_edited'
  | 'document_viewed'
  | 'event_created'
  | 'event_updated'
  | 'channel_created'
  | 'member_joined'
  | 'member_left';

export type EntityType =
  | 'message'
  | 'task'
  | 'document'
  | 'event'
  | 'channel'
  | 'workspace'
  | 'user';

export type ActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'completed'
  | 'archived'
  | 'restored'
  | 'viewed'
  | 'joined'
  | 'left';

// ============================================
// WORKSPACE ACTIVITY
// ============================================

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  userId?: string | null;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  activityType: ActivityType;
  entityType: EntityType;
  entityId?: string | null;
  action: ActionType;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface LogActivityRequest {
  activityType: ActivityType;
  entityType: EntityType;
  entityId?: string;
  action: ActionType;
  metadata?: Record<string, any>;
}

// ============================================
// USER ACTIVITY METRICS
// ============================================

export interface UserActivityMetrics {
  id: string;
  userId: string;
  workspaceId: string;
  date: Date;
  messagesSent: number;
  messagesReceived: number;
  tasksCreated: number;
  tasksCompleted: number;
  tasksAssigned: number;
  documentsCreated: number;
  documentsEdited: number;
  documentsViewed: number;
  eventsCreated: number;
  eventsAttended: number;
  activeTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserMetricsRequest {
  messagesSent?: number;
  messagesReceived?: number;
  tasksCreated?: number;
  tasksCompleted?: number;
  tasksAssigned?: number;
  documentsCreated?: number;
  documentsEdited?: number;
  documentsViewed?: number;
  eventsCreated?: number;
  eventsAttended?: number;
  activeTimeMinutes?: number;
}

// ============================================
// WORKSPACE METRICS
// ============================================

export interface WorkspaceMetrics {
  id: string;
  workspaceId: string;
  date: Date;
  totalMembers: number;
  activeMembers: number;
  totalMessages: number;
  totalChannels: number;
  totalTasks: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
  totalDocuments: number;
  documentsCreatedToday: number;
  documentsEditedToday: number;
  totalEvents: number;
  eventsToday: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateWorkspaceMetricsRequest {
  totalMembers?: number;
  activeMembers?: number;
  totalMessages?: number;
  totalChannels?: number;
  totalTasks?: number;
  tasksCompleted?: number;
  tasksInProgress?: number;
  tasksPending?: number;
  totalDocuments?: number;
  documentsCreatedToday?: number;
  documentsEditedToday?: number;
  totalEvents?: number;
  eventsToday?: number;
}

// ============================================
// TASK ANALYTICS
// ============================================

export interface TaskAnalytics {
  workspaceId: string;
  userId?: string | null;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  avgCompletionTimeHours?: number | null;
  criticalPriorityCount: number;
  highPriorityCount: number;
  tasksCreatedLast7Days: number;
  tasksCompletedLast7Days: number;
}

// ============================================
// DOCUMENT ANALYTICS
// ============================================

export interface DocumentAnalytics {
  workspaceId: string;
  userId?: string | null;
  totalDocuments: number;
  documentCount: number;
  wikiCount: number;
  noteCount: number;
  folderCount: number;
  activeDocuments: number;
  archivedDocuments: number;
  documentsCreatedLast7Days: number;
  documentsUpdatedLast7Days: number;
}

// ============================================
// EVENT ANALYTICS
// ============================================

export interface EventAnalytics {
  workspaceId: string;
  userId?: string | null;
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  recurringEvents: number;
  allDayEvents: number;
  eventsNext7Days: number;
  avgEventDurationHours?: number | null;
}

// ============================================
// WORKSPACE OVERVIEW
// ============================================

export interface WorkspaceOverview {
  workspaceId: string;
  workspaceName: string;
  totalMembers: number;
  onlineMembers: number;
  totalChannels: number;
  publicChannels: number;
  totalMessages: number;
  messagesLast24h: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  totalDocuments: number;
  documentsCreatedLast7Days: number;
  totalEvents: number;
  eventsNext7Days: number;
}

// ============================================
// USER PRODUCTIVITY
// ============================================

export interface UserProductivity {
  date: Date;
  messagesSent: number;
  tasksCompleted: number;
  documentsEdited: number;
  eventsAttended: number;
  activeTimeMinutes: number;
}

// ============================================
// WORKSPACE ACTIVITY SUMMARY
// ============================================

export interface WorkspaceActivitySummary {
  date: Date;
  totalMembers: number;
  activeMembers: number;
  totalMessages: number;
  tasksCompleted: number;
  documentsCreated: number;
  eventsCreated: number;
}

// ============================================
// RESPONSE DTOS
// ============================================

export interface RecentActivityResponse {
  activities: WorkspaceActivity[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserProductivityResponse {
  userId: string;
  workspaceId: string;
  days: number;
  data: UserProductivity[];
}

export interface WorkspaceActivitySummaryResponse {
  workspaceId: string;
  days: number;
  data: WorkspaceActivitySummary[];
}

export interface AllAnalyticsResponse {
  overview: WorkspaceOverview;
  taskAnalytics: TaskAnalytics | null;
  documentAnalytics: DocumentAnalytics | null;
  eventAnalytics: EventAnalytics | null;
  recentActivity: WorkspaceActivity[];
}
