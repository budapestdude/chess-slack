import { useNavigate, useParams } from 'react-router-dom';
import { Plus, FileText, Calendar, MessageSquare } from 'lucide-react';

interface QuickActionButton {
  id: string;
  label: string;
  icon: any;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  path: string;
}

export default function QuickActions() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const actions: QuickActionButton[] = [
    {
      id: 'create-task',
      label: 'Create Task',
      icon: Plus,
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
      iconColor: 'text-white',
      path: `/workspace/${workspaceId}/tasks`,
    },
    {
      id: 'create-document',
      label: 'Create Document',
      icon: FileText,
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-500',
      iconColor: 'text-white',
      path: `/workspace/${workspaceId}/documents`,
    },
    {
      id: 'schedule-event',
      label: 'Schedule Event',
      icon: Calendar,
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-red-500',
      iconColor: 'text-white',
      path: `/workspace/${workspaceId}/calendar`,
    },
    {
      id: 'send-message',
      label: 'Send Message',
      icon: MessageSquare,
      gradientFrom: 'from-green-500',
      gradientTo: 'to-emerald-500',
      iconColor: 'text-white',
      path: `/workspace/${workspaceId}`,
    },
  ];

  const handleAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

      <div className="space-y-3">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.path)}
              className={`w-full flex items-center space-x-4 p-4 rounded-lg bg-gradient-to-r ${action.gradientFrom} ${action.gradientTo} text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200 group`}
            >
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                <ActionIcon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <span className="font-medium text-left flex-1">{action.label}</span>
              <svg
                className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">Need help getting started?</p>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            View Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
