import { api } from './api';

// ==================== Type Definitions ====================

export interface OverviewAnalytics {
  totalMembers: number;
  totalMessages: number;
  totalTasks: number;
  totalDocuments: number;
  totalEvents: number;
  messagesToday: number;
  activeTasks: number;
  upcomingEvents: number;
  changes: {
    members: number;
    messages: number;
    tasks: number;
    events: number;
  };
}

export interface ActivityItem {
  id: string;
  type: 'message' | 'task_created' | 'task_completed' | 'document_created' | 'document_edited' | 'event_created' | 'member_joined';
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
  resourceId?: string;
  resourceName?: string;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UserProductivity {
  userId: string;
  userName: string;
  userAvatar?: string;
  messagesCount: number;
  tasksCompleted: number;
  documentsEdited: number;
  eventsAttended: number;
  totalActivity: number;
}

export interface ProductivityAnalytics {
  users: UserProductivity[];
  topPerformers: UserProductivity[];
  averageProductivity: {
    messages: number;
    tasks: number;
    documents: number;
    events: number;
  };
}

export interface ActivitySummaryPoint {
  date: string;
  messages: number;
  tasks: number;
  documents: number;
  events: number;
}

export interface ActivitySummaryAnalytics {
  daily: ActivitySummaryPoint[];
  weekly: ActivitySummaryPoint[];
  monthly: ActivitySummaryPoint[];
  period: 'daily' | 'weekly' | 'monthly';
}

export interface TaskStatusCount {
  status: string;
  count: number;
  percentage: number;
}

export interface TaskAnalytics {
  total: number;
  byStatus: TaskStatusCount[];
  byPriority: {
    priority: string;
    count: number;
  }[];
  completionRate: number;
  averageCompletionTime: number;
  overdueTasks: number;
  tasksCompletedToday: number;
  tasksCreatedToday: number;
  completionTrend: {
    date: string;
    completed: number;
    created: number;
  }[];
}

export interface DocumentAnalytics {
  total: number;
  createdToday: number;
  editedToday: number;
  totalEdits: number;
  averageEditsPerDocument: number;
  activityTrend: {
    date: string;
    created: number;
    edited: number;
  }[];
  topDocuments: {
    id: string;
    title: string;
    edits: number;
    views: number;
  }[];
}

export interface EventAnalytics {
  total: number;
  upcomingCount: number;
  pastCount: number;
  todayCount: number;
  thisWeekCount: number;
  attendanceRate: number;
  eventTrend: {
    date: string;
    count: number;
    attendance: number;
  }[];
  topEvents: {
    id: string;
    title: string;
    attendees: number;
    date: string;
  }[];
}

export interface AllAnalytics {
  overview: OverviewAnalytics;
  productivity: ProductivityAnalytics;
  activitySummary: ActivitySummaryAnalytics;
  tasks: TaskAnalytics;
  documents: DocumentAnalytics;
  events: EventAnalytics;
}

// ==================== API Functions ====================

export const analyticsService = {
  /**
   * Get overall workspace analytics overview
   */
  getOverview: async (workspaceId: string): Promise<OverviewAnalytics> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/overview`);
    return response.data;
  },

  /**
   * Get recent activity feed with pagination
   */
  getActivity: async (
    workspaceId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ActivityFeedResponse> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/activity`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get user productivity metrics
   */
  getProductivity: async (workspaceId: string): Promise<ProductivityAnalytics> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/productivity`);
    return response.data;
  },

  /**
   * Get workspace activity summary over time
   */
  getActivitySummary: async (
    workspaceId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<ActivitySummaryAnalytics> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/activity-summary`, {
      params: { period, days },
    });
    return response.data;
  },

  /**
   * Get task analytics and metrics
   */
  getTasks: async (workspaceId: string): Promise<TaskAnalytics> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/tasks`);
    return response.data;
  },

  /**
   * Get document analytics and metrics
   */
  getDocuments: async (workspaceId: string): Promise<DocumentAnalytics> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/documents`);
    return response.data;
  },

  /**
   * Get event analytics and metrics
   */
  getEvents: async (workspaceId: string): Promise<EventAnalytics> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/events`);
    return response.data;
  },

  /**
   * Get all analytics combined in a single request
   */
  getAll: async (workspaceId: string): Promise<AllAnalytics> => {
    const response = await api.get(`/workspaces/${workspaceId}/analytics/all`);
    return response.data;
  },
};

export default analyticsService;
