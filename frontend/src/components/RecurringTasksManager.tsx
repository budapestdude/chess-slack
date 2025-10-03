import React, { useState, useEffect } from 'react';
import {
  RecurringTask,
  getRecurringTasks,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  generateRecurringTasks,
} from '../services/personal';
import { PlusIcon, TrashIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface RecurringTasksManagerProps {
  workspaceId: number;
  isOpen: boolean;
  onClose: () => void;
  onTasksGenerated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const RecurringTasksManager: React.FC<RecurringTasksManagerProps> = ({
  workspaceId,
  isOpen,
  onClose,
  onTasksGenerated,
}) => {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    content: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'custom',
    frequency_days: [] as number[],
  });

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen, workspaceId]);

  const loadTasks = async () => {
    try {
      const data = await getRecurringTasks(workspaceId);
      setTasks(data);
    } catch (error) {
      console.error('Error loading recurring tasks:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.content.trim()) return;

    try {
      setLoading(true);
      await createRecurringTask(workspaceId, newTask);
      setNewTask({ content: '', frequency: 'daily', frequency_days: [] });
      setShowAddForm(false);
      loadTasks();
    } catch (error) {
      console.error('Error creating recurring task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (task: RecurringTask) => {
    try {
      await updateRecurringTask(workspaceId, task.id, { is_active: !task.is_active });
      loadTasks();
    } catch (error) {
      console.error('Error updating recurring task:', error);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Delete this recurring task?')) return;

    try {
      await deleteRecurringTask(workspaceId, taskId);
      loadTasks();
    } catch (error) {
      console.error('Error deleting recurring task:', error);
    }
  };

  const handleGenerateTasks = async () => {
    try {
      setLoading(true);
      await generateRecurringTasks(workspaceId);
      onTasksGenerated();
    } catch (error) {
      console.error('Error generating tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setNewTask((prev) => ({
      ...prev,
      frequency_days: prev.frequency_days.includes(day)
        ? prev.frequency_days.filter((d) => d !== day)
        : [...prev.frequency_days, day].sort(),
    }));
  };

  const getFrequencyLabel = (task: RecurringTask) => {
    switch (task.frequency) {
      case 'daily':
        return 'Every day';
      case 'weekdays':
        return 'Weekdays (Mon-Fri)';
      case 'weekends':
        return 'Weekends';
      case 'weekly':
      case 'custom':
        if (task.frequency_days && task.frequency_days.length > 0) {
          return task.frequency_days.map((d) => DAYS_OF_WEEK[d].label).join(', ');
        }
        return 'Custom';
      default:
        return task.frequency;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Recurring Tasks</h2>
            <p className="text-sm text-gray-600 mt-1">
              Automatically add these tasks to your daily checklist
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Generate Button */}
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-indigo-900">Generate Today's Tasks</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Click to add all active recurring tasks to today's checklist
                </p>
              </div>
              <button
                onClick={handleGenerateTasks}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Generate
              </button>
            </div>
          </div>

          {/* Add Task Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 mb-4"
            >
              <PlusIcon className="h-5 w-5" />
              Add Recurring Task
            </button>
          )}

          {/* Add Task Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                <input
                  type="text"
                  value={newTask.content}
                  onChange={(e) => setNewTask({ ...newTask, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Review emails, Take vitamins..."
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select
                  value={newTask.frequency}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      frequency: e.target.value as any,
                      frequency_days: [],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays (Mon-Fri)</option>
                  <option value="weekends">Weekends</option>
                  <option value="custom">Custom days</option>
                </select>
              </div>

              {newTask.frequency === 'custom' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Days</label>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          newTask.frequency_days.includes(day.value)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCreateTask}
                  disabled={loading || !newTask.content.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add Task
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTask({ content: '', frequency: 'daily', frequency_days: [] });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Recurring Tasks List */}
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No recurring tasks yet. Create one to automatically populate your daily checklist!
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border ${
                    task.is_active
                      ? 'bg-white border-gray-300'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={task.is_active}
                          onChange={() => handleToggleActive(task)}
                          className="h-5 w-5 text-indigo-600 rounded"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${task.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                            {task.content}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{getFrequencyLabel(task)}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            💡 Tip: Click "Generate" to add all active recurring tasks to today's checklist. Tasks are only
            added once per day.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecurringTasksManager;
