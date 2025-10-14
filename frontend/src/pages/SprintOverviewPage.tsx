import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Target,
  Users,
  TrendingUp,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Sprint, getSprints, createSprint, CreateSprintData } from '../services/sprint';
import { CreateSprintModal } from '../components/SprintModals';

const SprintOverviewPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadSprints();
    }
  }, [workspaceId]);

  const loadSprints = async () => {
    try {
      setLoading(true);
      const data = await getSprints(workspaceId!);
      setSprints(data);
    } catch (error) {
      console.error('Error loading sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (data: CreateSprintData) => {
    try {
      const newSprint = await createSprint(workspaceId!, data);
      await loadSprints();
      // Navigate to the new sprint
      navigate(`/workspace/${workspaceId}/marketing/sprint/${newSprint.id}`);
    } catch (error) {
      console.error('Error creating sprint:', error);
      throw error;
    }
  };

  const handleSprintClick = (sprintId: string) => {
    navigate(`/workspace/${workspaceId}/marketing/sprint/${sprintId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4" />;
      case 'planning':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const calculateProgress = (sprint: Sprint) => {
    if (!sprint.task_count || sprint.task_count === 0) return 0;
    return Math.round(((sprint.completed_task_count || 0) / sprint.task_count) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketing Sprints</h1>
            <p className="text-gray-600 mt-1">
              Manage your customer relationship tracking sprints
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create New Sprint
          </button>
        </div>
      </div>

      {/* Sprint Grid */}
      <div className="p-8">
        {sprints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Target className="w-20 h-20 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Sprints Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first sprint to start tracking customer relationships
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Sprint
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sprints.map((sprint) => {
              const progress = calculateProgress(sprint);
              const daysRemaining = getDaysRemaining(sprint.end_date);

              return (
                <div
                  key={sprint.id}
                  onClick={() => handleSprintClick(sprint.id)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {sprint.name}
                      </h3>
                      <div
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          sprint.status
                        )}`}
                      >
                        {getStatusIcon(sprint.status)}
                        <span className="capitalize">{sprint.status}</span>
                      </div>
                    </div>

                    {sprint.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {sprint.description}
                      </p>
                    )}

                    {sprint.goal && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-900 line-clamp-2">{sprint.goal}</p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-6 space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold text-gray-900">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-600">Days Left</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {daysRemaining > 0 ? daysRemaining : 'Ended'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-600">Tasks</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {sprint.completed_task_count || 0}/{sprint.task_count || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Users className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-600">Team</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {sprint.members?.length || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-600">Budget</p>
                          <p className="text-sm font-semibold text-gray-900">
                            ${sprint.budget?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          {new Date(sprint.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>→</span>
                        <span>
                          {new Date(sprint.end_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Sprint Modal */}
      <CreateSprintModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateSprint}
      />
    </div>
  );
};

export default SprintOverviewPage;
