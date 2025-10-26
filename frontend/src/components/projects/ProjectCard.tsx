import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../../services/projectService';

interface ProjectCardProps {
  project: Project;
  viewMode: 'grid' | 'list';
  onArchive: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, viewMode, onArchive }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/workspace/${project.workspace_id}/projects/${project.id}`);
  };

  const totalTasks = (project.active_tasks || 0) + (project.completed_tasks || 0);
  const completionPercentage = totalTasks > 0
    ? Math.round(((project.completed_tasks || 0) / totalTasks) * 100)
    : 0;

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-semibold flex-shrink-0"
              style={{ backgroundColor: project.color || '#6366f1' }}
            >
              {project.icon || project.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 truncate">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6 ml-4">
            <div className="text-sm">
              <span className="font-medium text-gray-900">{project.active_tasks || 0}</span>
              <span className="text-gray-600"> active</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">{completionPercentage}%</span>
              <span className="text-gray-600"> complete</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {project.default_view}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Project Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-semibold"
          style={{ backgroundColor: project.color || '#6366f1' }}
        >
          {project.icon || project.name.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive(project.id);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Archive project"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
      </div>

      {/* Project Name & Description */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{project.name}</h3>
      {project.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div>
            <span className="font-medium text-gray-900">{project.active_tasks || 0}</span>
            <span className="text-gray-600"> active</span>
          </div>
          <div>
            <span className="font-medium text-gray-900">{project.completed_tasks || 0}</span>
            <span className="text-gray-600"> done</span>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {project.default_view}
        </span>
      </div>
    </div>
  );
};

export default ProjectCard;
