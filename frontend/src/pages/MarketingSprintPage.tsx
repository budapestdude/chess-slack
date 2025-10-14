import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Play,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Filter,
} from 'lucide-react';
import {
  Sprint,
  SprintTask,
  getSprints,
  getTasks,
  createTask,
  createSprint,
  updateTask,
  deleteTask,
  updateSprint,
} from '../services/sprint';
import { CreateSprintModal, TaskModal } from '../components/SprintModals';

interface Column {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  color: string;
}

const columns: Column[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: 'bg-blue-50' },
  { id: 'review', title: 'Review', status: 'review', color: 'bg-yellow-50' },
  { id: 'completed', title: 'Completed', status: 'completed', color: 'bg-green-50' },
];

const MarketingSprintPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<SprintTask | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    if (workspaceId) {
      loadSprints();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (selectedSprint) {
      loadTasks();
    }
  }, [selectedSprint]);

  const loadSprints = async () => {
    try {
      setLoading(true);
      const data = await getSprints(workspaceId!, 'active');
      setSprints(data);
      if (data.length > 0 && !selectedSprint) {
        setSelectedSprint(data[0]);
      }
    } catch (error) {
      console.error('Error loading sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!selectedSprint) return;
    try {
      const data = await getTasks(workspaceId!, selectedSprint.id);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: SprintTask['status']) => {
    try {
      await updateTask(workspaceId!, selectedSprint!.id, taskId, { status: newStatus });
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleSprintStatusChange = async (newStatus: Sprint['status']) => {
    if (!selectedSprint) return;
    try {
      await updateSprint(workspaceId!, selectedSprint.id, { status: newStatus });
      await loadSprints();
    } catch (error) {
      console.error('Error updating sprint:', error);
    }
  };

  const handleCreateSprint = async (data: any) => {
    try {
      const newSprint = await createSprint(workspaceId!, data);
      await loadSprints();
      setSelectedSprint(newSprint);
    } catch (error) {
      console.error('Error creating sprint:', error);
      throw error;
    }
  };

  const handleCreateTask = async (data: any) => {
    if (!selectedSprint) return;
    try {
      await createTask(workspaceId!, selectedSprint.id, data);
      await loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const handleUpdateTask = async (data: any) => {
    if (!selectedSprint || !selectedTask) return;
    try {
      await updateTask(workspaceId!, selectedSprint.id, selectedTask.id, data);
      await loadTasks();
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const getTasksByStatus = (status: SprintTask['status']) => {
    return tasks.filter((task) => {
      const matchesStatus = task.status === status;
      const matchesType = filterType === 'all' || task.task_type === filterType;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesStatus && matchesType && matchesPriority;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-blue-600 bg-blue-100';
      case 'low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'content':
        return '📝';
      case 'design':
        return '🎨';
      case 'social':
        return '📱';
      case 'email':
        return '📧';
      case 'sponsor':
        return '🤝';
      case 'analytics':
        return '📊';
      default:
        return '📋';
    }
  };

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getDaysRemaining = () => {
    if (!selectedSprint) return 0;
    const end = new Date(selectedSprint.end_date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedSprint) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <Target className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Sprints</h2>
        <p className="text-gray-600 mb-6">Create your first marketing sprint to get started.</p>
        <button
          onClick={() => setIsSprintModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Create Sprint
        </button>
        <CreateSprintModal
          isOpen={isSprintModalOpen}
          onClose={() => setIsSprintModalOpen(false)}
          onSave={handleCreateSprint}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{selectedSprint.name}</h1>
            <select
              value={selectedSprint.id}
              onChange={(e) => {
                const sprint = sprints.find((s) => s.id === e.target.value);
                if (sprint) setSelectedSprint(sprint);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSprintStatusChange('active')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                selectedSprint.status === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Play className="w-4 h-4" />
              {selectedSprint.status === 'active' ? 'Active' : 'Start Sprint'}
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              New Task
            </button>
          </div>
        </div>

        {/* Sprint Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Days Remaining</p>
              <p className="text-lg font-bold text-gray-900">{getDaysRemaining()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-600">Progress</p>
              <p className="text-lg font-bold text-gray-900">{calculateProgress()}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-xs text-gray-600">Total Tasks</p>
              <p className="text-lg font-bold text-gray-900">{tasks.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xs text-gray-600">Team Members</p>
              <p className="text-lg font-bold text-gray-900">{selectedSprint.members?.length || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-xs text-gray-600">Budget</p>
              <p className="text-lg font-bold text-gray-900">
                ${selectedSprint.budget?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="content">Content</option>
            <option value="design">Design</option>
            <option value="social">Social Media</option>
            <option value="email">Email</option>
            <option value="sponsor">Sponsor</option>
            <option value="analytics">Analytics</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="grid grid-cols-4 gap-6 min-w-[1200px]">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
                <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">
                  {getTasksByStatus(column.status).length}
                </span>
              </div>

              {/* Tasks */}
              <div className={`flex-1 ${column.color} rounded-lg p-4 space-y-3 min-h-[200px]`}>
                {getTasksByStatus(column.status).map((task) => (
                  <div
                    key={task.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsTaskModalOpen(true);
                    }}
                  >
                    {/* Task Header */}
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{getTypeIcon(task.task_type)}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{task.title}</h4>

                    {/* Task Details */}
                    {task.description && (
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                    )}

                    {/* Task Footer */}
                    <div className="flex items-center justify-between">
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.assigned_to_username && (
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {task.assigned_to_username[0]}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Checklist Progress */}
                    {task.checklist && task.checklist.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {task.checklist.filter((item) => item.completed).length} / {task.checklist.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        task={selectedTask}
      />
    </div>
  );
};

export default MarketingSprintPage;
