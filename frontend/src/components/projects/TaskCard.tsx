import React, { useState } from 'react';
import { Task } from '../../services/taskService';

interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: string, updates: any) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_COLORS = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleToggleComplete = () => {
    const isCompleted = !!task.completed_at;
    onUpdate(task.id, {
      status: isCompleted ? 'pending' : 'completed',
      completed_at: isCompleted ? null : new Date().toISOString(),
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.due_date && !task.completed_at && new Date(task.due_date) < new Date();

  return (
    <div
      className={`bg-white rounded-lg border-l-4 ${PRIORITY_COLORS[task.priority]} shadow-sm hover:shadow-md transition-shadow cursor-move`}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <button
            onClick={handleToggleComplete}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              task.completed_at
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300 hover:border-blue-500'
            }`}
          >
            {task.completed_at && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 w-32">
                <button
                  onClick={() => {
                    onDelete(task.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className={`text-sm font-medium mb-2 ${task.completed_at ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {/* Due Date */}
            {task.due_date && (
              <span
                className={`flex items-center ${
                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                }`}
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(task.due_date)}
              </span>
            )}

            {/* Estimated Hours */}
            {task.estimated_hours && (
              <span className="flex items-center text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {task.estimated_hours}h
              </span>
            )}
          </div>

          {/* Assignee */}
          {task.assigned_user_name && (
            <div
              className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium"
              title={task.assigned_user_name}
            >
              {task.assigned_user_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
