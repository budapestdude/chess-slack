import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  CheckCircle2,
  FileText,
  Calendar,
  UserPlus,
  Plus,
  Loader2,
} from 'lucide-react';
import { ActivityItem } from '../../services/analytics';

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

const activityIcons: Record<string, { icon: any; color: string; bgColor: string }> = {
  message: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  task_created: {
    icon: Plus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  task_completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  document_created: {
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  document_edited: {
    icon: FileText,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  event_created: {
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  member_joined: {
    icon: UserPlus,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
};

export default function ActivityFeed({
  activities,
  loading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    return activityIcons[type] || activityIcons.message;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No recent activity</p>
          <p className="text-sm text-gray-400 mt-1">Activity will appear here as it happens</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>

      <div className="space-y-4">
        {activities.map((activity) => {
          const activityStyle = getActivityIcon(activity.type);
          const ActivityIcon = activityStyle.icon;

          return (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              {/* User Avatar */}
              <div className="relative flex-shrink-0">
                {activity.userAvatar ? (
                  <img
                    src={activity.userAvatar}
                    alt={activity.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                    {getInitials(activity.userName)}
                  </div>
                )}

                {/* Activity type icon badge */}
                <div
                  className={`absolute -bottom-1 -right-1 ${activityStyle.bgColor} rounded-full p-1 border-2 border-white`}
                >
                  <ActivityIcon className={`w-3 h-3 ${activityStyle.color}`} />
                </div>
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">{activity.userName}</span>{' '}
                  <span className="text-gray-600">{activity.content}</span>
                  {activity.resourceName && (
                    <span className="font-medium text-gray-900"> {activity.resourceName}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <span>Load More</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
