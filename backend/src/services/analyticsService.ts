import pool from '../database/db';
import logger from '../utils/logger';
import {
  WorkspaceActivity,
  UserActivityMetrics,
  WorkspaceMetrics,
  TaskAnalytics,
  DocumentAnalytics,
  EventAnalytics,
  WorkspaceOverview,
  UserProductivity,
  WorkspaceActivitySummary,
  ActivityType,
  EntityType,
  ActionType,
  UpdateUserMetricsRequest,
  UpdateWorkspaceMetricsRequest,
} from '../types/analytics';

/**
 * Service for managing analytics and dashboard data.
 * Handles activity logging, metrics aggregation, and analytics queries.
 */
class AnalyticsService {
  // ============================================
  // ACTIVITY LOGGING
  // ============================================

  /**
   * Log a workspace activity
   */
  async logActivity(
    workspaceId: string,
    userId: string,
    activityType: ActivityType,
    entityType: EntityType,
    entityId: string | null,
    action: ActionType,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const result = await pool.query(
        'SELECT log_workspace_activity($1, $2, $3, $4, $5, $6, $7) as activity_id',
        [workspaceId, userId, activityType, entityType, entityId, action, JSON.stringify(metadata)]
      );

      const activityId = result.rows[0].activity_id;
      logger.info('Activity logged', { activityId, workspaceId, userId, activityType });

      return activityId;
    } catch (error) {
      logger.error('Error logging activity', { error, workspaceId, userId, activityType });
      throw new Error(`Failed to log activity: ${error}`);
    }
  }

  /**
   * Get recent workspace activity
   */
  async getRecentActivity(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkspaceActivity[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM get_recent_activity($1, $2, $3)',
        [workspaceId, limit, offset]
      );

      return result.rows.map(row => this.mapRowToActivity(row));
    } catch (error) {
      logger.error('Error getting recent activity', { error, workspaceId });
      throw new Error(`Failed to get recent activity: ${error}`);
    }
  }

  // ============================================
  // WORKSPACE OVERVIEW
  // ============================================

  /**
   * Get workspace overview
   */
  async getWorkspaceOverview(workspaceId: string): Promise<WorkspaceOverview | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM workspace_overview WHERE workspace_id = $1',
        [workspaceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToOverview(result.rows[0]);
    } catch (error) {
      logger.error('Error getting workspace overview', { error, workspaceId });
      throw new Error(`Failed to get workspace overview: ${error}`);
    }
  }

  // ============================================
  // USER PRODUCTIVITY
  // ============================================

  /**
   * Get user productivity metrics
   */
  async getUserProductivity(
    userId: string,
    workspaceId: string,
    days: number = 7
  ): Promise<UserProductivity[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM get_user_productivity($1, $2, $3)',
        [userId, workspaceId, days]
      );

      return result.rows.map(row => this.mapRowToUserProductivity(row));
    } catch (error) {
      logger.error('Error getting user productivity', { error, userId, workspaceId });
      throw new Error(`Failed to get user productivity: ${error}`);
    }
  }

  /**
   * Update user activity metrics for a specific date
   */
  async updateUserMetrics(
    userId: string,
    workspaceId: string,
    date: Date,
    metrics: UpdateUserMetricsRequest
  ): Promise<UserActivityMetrics> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (metrics.messagesSent !== undefined) {
        fields.push(`messages_sent = messages_sent + $${paramIndex++}`);
        values.push(metrics.messagesSent);
      }
      if (metrics.messagesReceived !== undefined) {
        fields.push(`messages_received = messages_received + $${paramIndex++}`);
        values.push(metrics.messagesReceived);
      }
      if (metrics.tasksCreated !== undefined) {
        fields.push(`tasks_created = tasks_created + $${paramIndex++}`);
        values.push(metrics.tasksCreated);
      }
      if (metrics.tasksCompleted !== undefined) {
        fields.push(`tasks_completed = tasks_completed + $${paramIndex++}`);
        values.push(metrics.tasksCompleted);
      }
      if (metrics.tasksAssigned !== undefined) {
        fields.push(`tasks_assigned = tasks_assigned + $${paramIndex++}`);
        values.push(metrics.tasksAssigned);
      }
      if (metrics.documentsCreated !== undefined) {
        fields.push(`documents_created = documents_created + $${paramIndex++}`);
        values.push(metrics.documentsCreated);
      }
      if (metrics.documentsEdited !== undefined) {
        fields.push(`documents_edited = documents_edited + $${paramIndex++}`);
        values.push(metrics.documentsEdited);
      }
      if (metrics.documentsViewed !== undefined) {
        fields.push(`documents_viewed = documents_viewed + $${paramIndex++}`);
        values.push(metrics.documentsViewed);
      }
      if (metrics.eventsCreated !== undefined) {
        fields.push(`events_created = events_created + $${paramIndex++}`);
        values.push(metrics.eventsCreated);
      }
      if (metrics.eventsAttended !== undefined) {
        fields.push(`events_attended = events_attended + $${paramIndex++}`);
        values.push(metrics.eventsAttended);
      }
      if (metrics.activeTimeMinutes !== undefined) {
        fields.push(`active_time_minutes = active_time_minutes + $${paramIndex++}`);
        values.push(metrics.activeTimeMinutes);
      }

      if (fields.length === 0) {
        throw new Error('No metrics to update');
      }

      values.push(userId, workspaceId, date);

      const query = `
        INSERT INTO user_activity_metrics (
          user_id, workspace_id, date
        ) VALUES ($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})
        ON CONFLICT (user_id, workspace_id, date)
        DO UPDATE SET ${fields.join(', ')}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      logger.info('User metrics updated', { userId, workspaceId, date });
      return this.mapRowToUserMetrics(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user metrics', { error, userId, workspaceId });
      throw new Error(`Failed to update user metrics: ${error}`);
    }
  }

  // ============================================
  // WORKSPACE ACTIVITY SUMMARY
  // ============================================

  /**
   * Get workspace activity summary
   */
  async getWorkspaceActivitySummary(
    workspaceId: string,
    days: number = 7
  ): Promise<WorkspaceActivitySummary[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM get_workspace_activity_summary($1, $2)',
        [workspaceId, days]
      );

      return result.rows.map(row => this.mapRowToActivitySummary(row));
    } catch (error) {
      logger.error('Error getting workspace activity summary', { error, workspaceId });
      throw new Error(`Failed to get workspace activity summary: ${error}`);
    }
  }

  /**
   * Update workspace metrics for a specific date
   */
  async updateWorkspaceMetrics(
    workspaceId: string,
    date: Date,
    metrics: UpdateWorkspaceMetricsRequest
  ): Promise<WorkspaceMetrics> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (metrics.totalMembers !== undefined) {
        fields.push(`total_members = $${paramIndex++}`);
        values.push(metrics.totalMembers);
      }
      if (metrics.activeMembers !== undefined) {
        fields.push(`active_members = $${paramIndex++}`);
        values.push(metrics.activeMembers);
      }
      if (metrics.totalMessages !== undefined) {
        fields.push(`total_messages = $${paramIndex++}`);
        values.push(metrics.totalMessages);
      }
      if (metrics.totalChannels !== undefined) {
        fields.push(`total_channels = $${paramIndex++}`);
        values.push(metrics.totalChannels);
      }
      if (metrics.totalTasks !== undefined) {
        fields.push(`total_tasks = $${paramIndex++}`);
        values.push(metrics.totalTasks);
      }
      if (metrics.tasksCompleted !== undefined) {
        fields.push(`tasks_completed = $${paramIndex++}`);
        values.push(metrics.tasksCompleted);
      }
      if (metrics.tasksInProgress !== undefined) {
        fields.push(`tasks_in_progress = $${paramIndex++}`);
        values.push(metrics.tasksInProgress);
      }
      if (metrics.tasksPending !== undefined) {
        fields.push(`tasks_pending = $${paramIndex++}`);
        values.push(metrics.tasksPending);
      }
      if (metrics.totalDocuments !== undefined) {
        fields.push(`total_documents = $${paramIndex++}`);
        values.push(metrics.totalDocuments);
      }
      if (metrics.documentsCreatedToday !== undefined) {
        fields.push(`documents_created_today = documents_created_today + $${paramIndex++}`);
        values.push(metrics.documentsCreatedToday);
      }
      if (metrics.documentsEditedToday !== undefined) {
        fields.push(`documents_edited_today = documents_edited_today + $${paramIndex++}`);
        values.push(metrics.documentsEditedToday);
      }
      if (metrics.totalEvents !== undefined) {
        fields.push(`total_events = $${paramIndex++}`);
        values.push(metrics.totalEvents);
      }
      if (metrics.eventsToday !== undefined) {
        fields.push(`events_today = events_today + $${paramIndex++}`);
        values.push(metrics.eventsToday);
      }

      if (fields.length === 0) {
        throw new Error('No metrics to update');
      }

      values.push(workspaceId, date);

      const query = `
        INSERT INTO workspace_metrics (
          workspace_id, date
        ) VALUES ($${paramIndex}, $${paramIndex + 1})
        ON CONFLICT (workspace_id, date)
        DO UPDATE SET ${fields.join(', ')}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      logger.info('Workspace metrics updated', { workspaceId, date });
      return this.mapRowToWorkspaceMetrics(result.rows[0]);
    } catch (error) {
      logger.error('Error updating workspace metrics', { error, workspaceId });
      throw new Error(`Failed to update workspace metrics: ${error}`);
    }
  }

  // ============================================
  // ANALYTICS VIEWS
  // ============================================

  /**
   * Get task analytics
   */
  async getTaskAnalytics(
    workspaceId: string,
    userId?: string
  ): Promise<TaskAnalytics | null> {
    try {
      let query = 'SELECT * FROM task_analytics WHERE workspace_id = $1';
      const params: any[] = [workspaceId];

      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId);
      } else {
        query += ' AND user_id IS NULL';
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTaskAnalytics(result.rows[0]);
    } catch (error) {
      logger.error('Error getting task analytics', { error, workspaceId, userId });
      throw new Error(`Failed to get task analytics: ${error}`);
    }
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(
    workspaceId: string,
    userId?: string
  ): Promise<DocumentAnalytics | null> {
    try {
      let query = 'SELECT * FROM document_analytics WHERE workspace_id = $1';
      const params: any[] = [workspaceId];

      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId);
      } else {
        query += ' AND user_id IS NULL';
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDocumentAnalytics(result.rows[0]);
    } catch (error) {
      logger.error('Error getting document analytics', { error, workspaceId, userId });
      throw new Error(`Failed to get document analytics: ${error}`);
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(
    workspaceId: string,
    userId?: string
  ): Promise<EventAnalytics | null> {
    try {
      let query = 'SELECT * FROM event_analytics WHERE workspace_id = $1';
      const params: any[] = [workspaceId];

      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId);
      } else {
        query += ' AND user_id IS NULL';
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEventAnalytics(result.rows[0]);
    } catch (error) {
      logger.error('Error getting event analytics', { error, workspaceId, userId });
      throw new Error(`Failed to get event analytics: ${error}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map database row to WorkspaceActivity
   */
  private mapRowToActivity(row: any): WorkspaceActivity {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      activityType: row.activity_type as ActivityType,
      entityType: row.entity_type as EntityType,
      entityId: row.entity_id,
      action: row.action as ActionType,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map database row to WorkspaceOverview
   */
  private mapRowToOverview(row: any): WorkspaceOverview {
    return {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      totalMembers: parseInt(row.total_members, 10) || 0,
      onlineMembers: parseInt(row.online_members, 10) || 0,
      totalChannels: parseInt(row.total_channels, 10) || 0,
      publicChannels: parseInt(row.public_channels, 10) || 0,
      totalMessages: parseInt(row.total_messages, 10) || 0,
      messagesLast24h: parseInt(row.messages_last_24h, 10) || 0,
      totalTasks: parseInt(row.total_tasks, 10) || 0,
      completedTasks: parseInt(row.completed_tasks, 10) || 0,
      inProgressTasks: parseInt(row.in_progress_tasks, 10) || 0,
      pendingTasks: parseInt(row.pending_tasks, 10) || 0,
      totalDocuments: parseInt(row.total_documents, 10) || 0,
      documentsCreatedLast7Days: parseInt(row.documents_created_last_7_days, 10) || 0,
      totalEvents: parseInt(row.total_events, 10) || 0,
      eventsNext7Days: parseInt(row.events_next_7_days, 10) || 0,
    };
  }

  /**
   * Map database row to UserProductivity
   */
  private mapRowToUserProductivity(row: any): UserProductivity {
    return {
      date: new Date(row.date),
      messagesSent: row.messages_sent || 0,
      tasksCompleted: row.tasks_completed || 0,
      documentsEdited: row.documents_edited || 0,
      eventsAttended: row.events_attended || 0,
      activeTimeMinutes: row.active_time_minutes || 0,
    };
  }

  /**
   * Map database row to WorkspaceActivitySummary
   */
  private mapRowToActivitySummary(row: any): WorkspaceActivitySummary {
    return {
      date: new Date(row.date),
      totalMembers: row.total_members || 0,
      activeMembers: row.active_members || 0,
      totalMessages: row.total_messages || 0,
      tasksCompleted: row.tasks_completed || 0,
      documentsCreated: row.documents_created || 0,
      eventsCreated: row.events_created || 0,
    };
  }

  /**
   * Map database row to UserActivityMetrics
   */
  private mapRowToUserMetrics(row: any): UserActivityMetrics {
    return {
      id: row.id,
      userId: row.user_id,
      workspaceId: row.workspace_id,
      date: new Date(row.date),
      messagesSent: row.messages_sent || 0,
      messagesReceived: row.messages_received || 0,
      tasksCreated: row.tasks_created || 0,
      tasksCompleted: row.tasks_completed || 0,
      tasksAssigned: row.tasks_assigned || 0,
      documentsCreated: row.documents_created || 0,
      documentsEdited: row.documents_edited || 0,
      documentsViewed: row.documents_viewed || 0,
      eventsCreated: row.events_created || 0,
      eventsAttended: row.events_attended || 0,
      activeTimeMinutes: row.active_time_minutes || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to WorkspaceMetrics
   */
  private mapRowToWorkspaceMetrics(row: any): WorkspaceMetrics {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      date: new Date(row.date),
      totalMembers: row.total_members || 0,
      activeMembers: row.active_members || 0,
      totalMessages: row.total_messages || 0,
      totalChannels: row.total_channels || 0,
      totalTasks: row.total_tasks || 0,
      tasksCompleted: row.tasks_completed || 0,
      tasksInProgress: row.tasks_in_progress || 0,
      tasksPending: row.tasks_pending || 0,
      totalDocuments: row.total_documents || 0,
      documentsCreatedToday: row.documents_created_today || 0,
      documentsEditedToday: row.documents_edited_today || 0,
      totalEvents: row.total_events || 0,
      eventsToday: row.events_today || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to TaskAnalytics
   */
  private mapRowToTaskAnalytics(row: any): TaskAnalytics {
    return {
      workspaceId: row.workspace_id,
      userId: row.user_id,
      totalTasks: parseInt(row.total_tasks, 10) || 0,
      pendingTasks: parseInt(row.pending_tasks, 10) || 0,
      inProgressTasks: parseInt(row.in_progress_tasks, 10) || 0,
      completedTasks: parseInt(row.completed_tasks, 10) || 0,
      failedTasks: parseInt(row.failed_tasks, 10) || 0,
      cancelledTasks: parseInt(row.cancelled_tasks, 10) || 0,
      avgCompletionTimeHours: row.avg_completion_time_hours ? parseFloat(row.avg_completion_time_hours) : null,
      criticalPriorityCount: parseInt(row.critical_priority_count, 10) || 0,
      highPriorityCount: parseInt(row.high_priority_count, 10) || 0,
      tasksCreatedLast7Days: parseInt(row.tasks_created_last_7_days, 10) || 0,
      tasksCompletedLast7Days: parseInt(row.tasks_completed_last_7_days, 10) || 0,
    };
  }

  /**
   * Map database row to DocumentAnalytics
   */
  private mapRowToDocumentAnalytics(row: any): DocumentAnalytics {
    return {
      workspaceId: row.workspace_id,
      userId: row.user_id,
      totalDocuments: parseInt(row.total_documents, 10) || 0,
      documentCount: parseInt(row.document_count, 10) || 0,
      wikiCount: parseInt(row.wiki_count, 10) || 0,
      noteCount: parseInt(row.note_count, 10) || 0,
      folderCount: parseInt(row.folder_count, 10) || 0,
      activeDocuments: parseInt(row.active_documents, 10) || 0,
      archivedDocuments: parseInt(row.archived_documents, 10) || 0,
      documentsCreatedLast7Days: parseInt(row.documents_created_last_7_days, 10) || 0,
      documentsUpdatedLast7Days: parseInt(row.documents_updated_last_7_days, 10) || 0,
    };
  }

  /**
   * Map database row to EventAnalytics
   */
  private mapRowToEventAnalytics(row: any): EventAnalytics {
    return {
      workspaceId: row.workspace_id,
      userId: row.user_id,
      totalEvents: parseInt(row.total_events, 10) || 0,
      upcomingEvents: parseInt(row.upcoming_events, 10) || 0,
      pastEvents: parseInt(row.past_events, 10) || 0,
      recurringEvents: parseInt(row.recurring_events, 10) || 0,
      allDayEvents: parseInt(row.all_day_events, 10) || 0,
      eventsNext7Days: parseInt(row.events_next_7_days, 10) || 0,
      avgEventDurationHours: row.avg_event_duration_hours ? parseFloat(row.avg_event_duration_hours) : null,
    };
  }
}

export default new AnalyticsService();
