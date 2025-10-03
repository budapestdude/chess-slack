import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Users, MessageSquare, CheckSquare, Calendar } from 'lucide-react';
import analyticsService, {
  OverviewAnalytics,
  ActivityItem,
  UserProductivity,
} from '../services/analytics';
import StatCard from '../components/dashboard/StatCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import TaskCompletionChart from '../components/dashboard/TaskCompletionChart';
import DocumentActivityChart from '../components/dashboard/DocumentActivityChart';
import ProductivityTable from '../components/dashboard/ProductivityTable';
import QuickActions from '../components/dashboard/QuickActions';

export default function DashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // State
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [productivity, setProductivity] = useState<UserProductivity[]>([]);
  const [taskChartData, setTaskChartData] = useState<any[]>([]);
  const [documentChartData, setDocumentChartData] = useState<any[]>([]);

  // Auto-refresh interval (30 seconds)
  const REFRESH_INTERVAL = 30000;

  const loadDashboardData = useCallback(async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);

      // Fetch all analytics data in parallel
      const [
        overviewData,
        activityData,
        productivityData,
        taskData,
        documentData,
      ] = await Promise.all([
        analyticsService.getOverview(workspaceId),
        analyticsService.getActivity(workspaceId, 1, 10),
        analyticsService.getProductivity(workspaceId),
        analyticsService.getTasks(workspaceId),
        analyticsService.getDocuments(workspaceId),
      ]);

      setOverview(overviewData);
      setActivities(activityData.activities);
      setHasMoreActivities(activityData.hasMore);
      setActivityPage(1);
      setProductivity(productivityData.users);
      setTaskChartData(taskData.completionTrend || []);
      setDocumentChartData(documentData.activityTrend || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use mock data for development
      setOverview(getMockOverview());
      setActivities(getMockActivities());
      setProductivity(getMockProductivity());
      setTaskChartData(getMockTaskChartData());
      setDocumentChartData(getMockDocumentChartData());
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const loadMoreActivities = async () => {
    if (!workspaceId || loadingMoreActivities) return;

    try {
      setLoadingMoreActivities(true);
      const nextPage = activityPage + 1;
      const activityData = await analyticsService.getActivity(workspaceId, nextPage, 10);

      setActivities([...activities, ...activityData.activities]);
      setHasMoreActivities(activityData.hasMore);
      setActivityPage(nextPage);
    } catch (error) {
      console.error('Failed to load more activities:', error);
    } finally {
      setLoadingMoreActivities(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workspace Dashboard</h1>
          <p className="text-gray-600">
            Overview of your workspace activity and team performance
          </p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Members"
            value={overview?.totalMembers || 0}
            change={overview?.changes.members}
            icon={Users}
            iconColor="text-white"
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
            loading={loading}
          />
          <StatCard
            title="Messages Today"
            value={overview?.messagesToday || 0}
            change={overview?.changes.messages}
            icon={MessageSquare}
            iconColor="text-white"
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
            loading={loading}
          />
          <StatCard
            title="Active Tasks"
            value={overview?.activeTasks || 0}
            change={overview?.changes.tasks}
            icon={CheckSquare}
            iconColor="text-white"
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
            loading={loading}
          />
          <StatCard
            title="Upcoming Events"
            value={overview?.upcomingEvents || 0}
            change={overview?.changes.events}
            icon={Calendar}
            iconColor="text-white"
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
            loading={loading}
          />
        </div>

        {/* Activity Feed and Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ActivityFeed
              activities={activities}
              loading={loading}
              hasMore={hasMoreActivities}
              onLoadMore={loadMoreActivities}
              loadingMore={loadingMoreActivities}
            />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TaskCompletionChart data={taskChartData} loading={loading} />
          <DocumentActivityChart data={documentChartData} loading={loading} />
        </div>

        {/* Productivity Table Row */}
        <div>
          <ProductivityTable users={productivity} loading={loading} />
        </div>
      </div>
    </div>
  );
}

// ==================== Mock Data for Development ====================

function getMockOverview(): OverviewAnalytics {
  return {
    totalMembers: 24,
    totalMessages: 1248,
    totalTasks: 67,
    totalDocuments: 45,
    totalEvents: 12,
    messagesToday: 87,
    activeTasks: 23,
    upcomingEvents: 5,
    changes: {
      members: 8.5,
      messages: 12.3,
      tasks: -3.2,
      events: 15.7,
    },
  };
}

function getMockActivities(): ActivityItem[] {
  return [
    {
      id: '1',
      type: 'message',
      userId: '1',
      userName: 'Alice Johnson',
      content: 'sent a message in',
      resourceName: '#general',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'task_completed',
      userId: '2',
      userName: 'Bob Smith',
      content: 'completed task',
      resourceName: 'Update user authentication',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'document_created',
      userId: '3',
      userName: 'Carol White',
      content: 'created document',
      resourceName: 'API Documentation',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      type: 'event_created',
      userId: '4',
      userName: 'David Brown',
      content: 'scheduled event',
      resourceName: 'Team Standup',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      type: 'member_joined',
      userId: '5',
      userName: 'Eve Martinez',
      content: 'joined the workspace',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
  ];
}

function getMockProductivity(): UserProductivity[] {
  return [
    {
      userId: '1',
      userName: 'Alice Johnson',
      messagesCount: 156,
      tasksCompleted: 24,
      documentsEdited: 18,
      eventsAttended: 8,
      totalActivity: 206,
    },
    {
      userId: '2',
      userName: 'Bob Smith',
      messagesCount: 143,
      tasksCompleted: 31,
      documentsEdited: 12,
      eventsAttended: 10,
      totalActivity: 196,
    },
    {
      userId: '3',
      userName: 'Carol White',
      messagesCount: 98,
      tasksCompleted: 19,
      documentsEdited: 27,
      eventsAttended: 7,
      totalActivity: 151,
    },
    {
      userId: '4',
      userName: 'David Brown',
      messagesCount: 87,
      tasksCompleted: 15,
      documentsEdited: 9,
      eventsAttended: 12,
      totalActivity: 123,
    },
    {
      userId: '5',
      userName: 'Eve Martinez',
      messagesCount: 72,
      tasksCompleted: 11,
      documentsEdited: 14,
      eventsAttended: 6,
      totalActivity: 103,
    },
  ];
}

function getMockTaskChartData() {
  const today = new Date();
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      completed: Math.floor(Math.random() * 10) + 3,
      created: Math.floor(Math.random() * 12) + 5,
    });
  }

  return data;
}

function getMockDocumentChartData() {
  const today = new Date();
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      created: Math.floor(Math.random() * 5) + 1,
      edited: Math.floor(Math.random() * 15) + 5,
    });
  }

  return data;
}
