import React, { useState } from 'react';
import { Task } from '../../services/taskService';

interface TaskRowProps {
  task: Task;
  onUpdate: (taskId: string, updates: any) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const TaskRow: React.FC<TaskRowProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [showDetails, setShowDetails] = useState(false);

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

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
    <div className="group hover:bg-gray-50 transition-colors">
      <div className="px-4 py-3 flex items-center">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-all ${
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

        {/* Task Title */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle()}
              className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`text-left w-full truncate ${
                task.completed_at ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {task.title}
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center space-x-3 ml-4">
          {/* Priority */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>

          {/* Due Date */}
          {task.due_date && (
            <span
              className={`text-sm ${
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
              }`}
            >
              {formatDate(task.due_date)}
            </span>
          )}

          {/* Assignee */}
          {task.assigned_user_name && (
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                {task.assigned_user_name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
          <div className="space-y-2 text-sm">
            {task.description && (
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-600 mt-1">{task.description}</p>
              </div>
            )}
            {task.estimated_hours && (
              <div>
                <span className="font-medium text-gray-700">Estimated:</span>
                <span className="text-gray-600 ml-2">{task.estimated_hours}h</span>
              </div>
            )}
            {task.start_date && (
              <div>
                <span className="font-medium text-gray-700">Start Date:</span>
                <span className="text-gray-600 ml-2">{formatDate(task.start_date)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskRow;
