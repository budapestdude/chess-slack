import React, { useState } from 'react';
import {
  DailyChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  bulkCreateChecklistItems,
  getDailyChecklist,
} from '../services/personal';
import { CheckCircleIcon, TrashIcon, PlusIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import RecurringTasksManager from './RecurringTasksManager';

interface DailyChecklistCardProps {
  workspaceId: string;
  items: DailyChecklistItem[];
  onUpdate: () => void;
}

const DailyChecklistCard: React.FC<DailyChecklistCardProps> = ({ workspaceId, items, onUpdate }) => {
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewingItems, setViewingItems] = useState<DailyChecklistItem[]>(items);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  const loadDateData = async (date: string) => {
    try {
      const data = await getDailyChecklist(workspaceId, date);
      setViewingItems(data);
    } catch (error) {
      console.error('Error loading checklist for date:', error);
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    loadDateData(newDate);
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    const newDate = date.toISOString().split('T')[0];
    handleDateChange(newDate);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const newDate = date.toISOString().split('T')[0];
    handleDateChange(newDate);
  };

  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    handleDateChange(today);
  };

  const handleToggle = async (itemId: number) => {
    try {
      await toggleChecklistItem(workspaceId, itemId);
      loadDateData(selectedDate);
      if (isToday) onUpdate();
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      await deleteChecklistItem(workspaceId, itemId);
      loadDateData(selectedDate);
      if (isToday) onUpdate();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;

    try {
      setLoading(true);
      // Split by newlines and filter out empty lines
      const taskLines = bulkText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (taskLines.length === 0) return;

      await bulkCreateChecklistItems(workspaceId, taskLines, selectedDate);
      setBulkText('');
      setShowBulkAdd(false);
      loadDateData(selectedDate);
      if (isToday) onUpdate();
    } catch (error) {
      console.error('Error adding bulk items:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHideCompleted = () => {
    setHideCompleted(!hideCompleted);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const completedCount = viewingItems.filter((item) => item.completed).length;
  const totalCount = viewingItems.length;
  const displayedItems = hideCompleted ? viewingItems.filter((item) => !item.completed) : viewingItems;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(dateStr + 'T00:00:00');
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous day"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-600 mt-1">{formatDate(selectedDate)}</p>
              </div>
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next day"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
            {!isToday && (
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200"
              >
                Go to Today
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isToday ? "Today's Checklist" : 'Daily Checklist'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {completedCount} of {totalCount} completed
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRecurringManager(true)}
              className="flex items-center px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              title="Manage recurring tasks"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Recurring
            </button>
            {completedCount > 0 && (
              <button
                onClick={toggleHideCompleted}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {hideCompleted ? 'Show Completed' : 'Hide Completed'}
              </button>
            )}
            <button
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Tasks
            </button>
          </div>
        </div>

        {/* Bulk Add Form */}
        {showBulkAdd && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="flex items-start gap-2 mb-3">
              <SparklesIcon className="h-5 w-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Add Multiple Tasks</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Paste your task list below (one task per line)
                </p>
              </div>
            </div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              rows={6}
              placeholder="Task 1&#10;Task 2&#10;Task 3&#10;..."
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleBulkAdd}
                disabled={loading || !bulkText.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add All Tasks'}
              </button>
              <button
                onClick={() => {
                  setShowBulkAdd(false);
                  setBulkText('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Checklist Items */}
        <div className="space-y-2">
          {viewingItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {isToday
                  ? "No tasks for today. Click 'Add Tasks' to get started!"
                  : `No tasks for ${formatDate(selectedDate)}`}
              </p>
            </div>
          ) : (
            displayedItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  item.completed
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => handleToggle(item.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-gray-100"
                >
                  {item.completed ? (
                    <CheckCircleSolid className="h-6 w-6 text-green-600" />
                  ) : (
                    <CheckCircleIcon className="h-6 w-6 text-gray-400" />
                  )}
                </button>
                <span
                  className={`flex-1 ${
                    item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {item.content}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Completion Message */}
        {totalCount > 0 && completedCount === totalCount && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium text-center">
              🎉 All tasks completed! Great job!
            </p>
          </div>
        )}
      </div>

      {/* Recurring Tasks Manager Modal */}
      <RecurringTasksManager
        workspaceId={workspaceId}
        isOpen={showRecurringManager}
        onClose={() => setShowRecurringManager(false)}
        onTasksGenerated={() => {
          loadDateData(selectedDate);
          if (isToday) onUpdate();
        }}
      />
    </div>
  );
};

export default DailyChecklistCard;
