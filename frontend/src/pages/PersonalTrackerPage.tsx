import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getHabits,
  createHabit,
  createCheckin,
  getPersonalTasks,
  createPersonalTask,
  updatePersonalTask,
  getDashboardStats,
  getDailyChecklist,
  PersonalHabit,
  PersonalTask,
  PersonalDashboardStats,
  DailyChecklistItem,
  CreateHabitRequest,
  CreatePersonalTaskRequest,
} from '../services/personal';
import DailyChecklistCard from '../components/DailyChecklistCard';
import {
  PlusIcon,
  FireIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

const PersonalTrackerPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [habits, setHabits] = useState<PersonalHabit[]>([]);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [checklistItems, setChecklistItems] = useState<DailyChecklistItem[]>([]);
  const [stats, setStats] = useState<PersonalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewHabitForm, setShowNewHabitForm] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  const [newHabit, setNewHabit] = useState<CreateHabitRequest>({
    name: '',
    target_type: 'boolean',
    frequency: 'daily',
  });

  const [newTask, setNewTask] = useState<CreatePersonalTaskRequest>({
    title: '',
    priority: 'medium',
    status: 'todo',
  });

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      const [habitsData, tasksData, statsData, checklistData] = await Promise.all([
        getHabits(parseInt(workspaceId)),
        getPersonalTasks(parseInt(workspaceId)),
        getDashboardStats(parseInt(workspaceId)),
        getDailyChecklist(parseInt(workspaceId)),
      ]);
      setHabits(habitsData);
      setTasks(tasksData);
      setStats(statsData);
      setChecklistItems(checklistData);
    } catch (error) {
      console.error('Error loading personal tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newHabit.name.trim()) return;

    try {
      await createHabit(parseInt(workspaceId), newHabit);
      setNewHabit({ name: '', target_type: 'boolean', frequency: 'daily' });
      setShowNewHabitForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newTask.title.trim()) return;

    try {
      await createPersonalTask(parseInt(workspaceId), newTask);
      setNewTask({ title: '', priority: 'medium', status: 'todo' });
      setShowNewTaskForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCheckIn = async (habitId: number, completed: boolean) => {
    if (!workspaceId) return;

    try {
      await createCheckin(parseInt(workspaceId), {
        habit_id: habitId,
        completed,
        check_date: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleToggleTask = async (task: PersonalTask) => {
    if (!workspaceId) return;

    try {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      await updatePersonalTask(parseInt(workspaceId), task.id, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getTodayCheckin = (habit: PersonalHabit) => {
    const today = new Date().toISOString().split('T')[0];
    return habit.last_checkin?.check_date === today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Personal Tracker</h1>
          <p className="text-gray-600 mt-2">Track your habits, tasks, and personal goals</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Active Habits</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_habits}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.today_completed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Pending Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.today_pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center">
                <FireIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Upcoming Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.upcoming_tasks.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily Checklist Section */}
        <div className="mb-8">
          <DailyChecklistCard
            workspaceId={parseInt(workspaceId!)}
            items={checklistItems}
            onUpdate={loadData}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Habits Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Daily Habits</h2>
              <button
                onClick={() => setShowNewHabitForm(!showNewHabitForm)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Habit
              </button>
            </div>

            {showNewHabitForm && (
              <div className="bg-white rounded-lg p-6 shadow mb-4">
                <form onSubmit={handleCreateHabit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Habit Name</label>
                    <input
                      type="text"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Morning Exercise, Read 30 mins"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newHabit.target_type}
                      onChange={(e) =>
                        setNewHabit({ ...newHabit, target_type: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="boolean">Yes/No</option>
                      <option value="numeric">Number (e.g., steps)</option>
                      <option value="duration">Duration (minutes)</option>
                    </select>
                  </div>
                  {newHabit.target_type !== 'boolean' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newHabit.target_value || ''}
                          onChange={(e) =>
                            setNewHabit({ ...newHabit, target_value: parseFloat(e.target.value) })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., 10000"
                        />
                        <input
                          type="text"
                          value={newHabit.target_unit || ''}
                          onChange={(e) => setNewHabit({ ...newHabit, target_unit: e.target.value })}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., steps"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Create Habit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewHabitForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {habits.map((habit) => {
                const isCheckedToday = getTodayCheckin(habit);
                return (
                  <div key={habit.id} className="bg-white rounded-lg p-6 shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{habit.name}</h3>
                        {habit.description && (
                          <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center text-sm">
                            <FireIcon className="h-4 w-4 text-orange-500 mr-1" />
                            <span className="font-medium">{habit.current_streak || 0}</span>
                            <span className="text-gray-600 ml-1">day streak</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {habit.completion_rate || 0}% completion
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckIn(habit.id, !isCheckedToday)}
                        className={`p-2 rounded-lg transition-colors ${
                          isCheckedToday
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {isCheckedToday ? (
                          <CheckCircleSolid className="h-8 w-8" />
                        ) : (
                          <CheckCircleIcon className="h-8 w-8" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              {habits.length === 0 && (
                <div className="bg-white rounded-lg p-12 text-center shadow">
                  <p className="text-gray-500">No habits yet. Create your first habit to get started!</p>
                </div>
              )}
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Personal Tasks</h2>
              <button
                onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Task
              </button>
            </div>

            {showNewTaskForm && (
              <div className="bg-white rounded-lg p-6 shadow mb-4">
                <form onSubmit={handleCreateTask}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="What do you need to do?"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date || ''}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Create Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewTaskForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {tasks
                .filter((t) => t.status !== 'completed')
                .map((task) => (
                  <div key={task.id} className="bg-white rounded-lg p-4 shadow">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="mt-1 p-1 rounded hover:bg-gray-100"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircleSolid className="h-6 w-6 text-green-600" />
                        ) : (
                          <CheckCircleIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              task.priority === 'urgent'
                                ? 'bg-red-100 text-red-700'
                                : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-700'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <span className="text-xs text-gray-600">Due: {task.due_date}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {tasks.filter((t) => t.status !== 'completed').length === 0 && (
                <div className="bg-white rounded-lg p-12 text-center shadow">
                  <p className="text-gray-500">No pending tasks. Great job!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalTrackerPage;
