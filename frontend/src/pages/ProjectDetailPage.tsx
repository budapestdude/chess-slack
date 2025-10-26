import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectService, { Project } from '../services/projectService';
import ProjectListView from '../components/projects/ProjectListView';
import ProjectBoardView from '../components/projects/ProjectBoardView';
import ProjectTimelineView from '../components/projects/ProjectTimelineView';
import toast from 'react-hot-toast';

const ProjectDetailPage: React.FC = () => {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'board' | 'timeline' | 'calendar'>('list');

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
      setCurrentView(data.default_view);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = async (view: 'list' | 'board' | 'timeline' | 'calendar') => {
    setCurrentView(view);
    if (projectId && view !== project?.default_view) {
      try {
        await projectService.updateProject(projectId, { default_view: view });
        if (project) {
          setProject({ ...project, default_view: view });
        }
      } catch (error) {
        console.error('Error updating default view:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-600 mb-4">Project not found</p>
        <button
          onClick={() => navigate(`/workspace/${workspaceId}/projects`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/projects`)}
              className="mr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-semibold"
              style={{ backgroundColor: project.color || '#6366f1' }}
            >
              {project.icon || project.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              )}
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleViewChange('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'list'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => handleViewChange('board')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'board'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Board View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
            <button
              onClick={() => handleViewChange('timeline')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'timeline'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Timeline View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'list' && <ProjectListView project={project} onUpdate={loadProject} />}
        {currentView === 'board' && <ProjectBoardView project={project} onUpdate={loadProject} />}
        {currentView === 'timeline' && <ProjectTimelineView project={project} onUpdate={loadProject} />}
        {currentView === 'calendar' && (
          <div className="flex items-center justify-center h-full text-gray-600">
            Calendar view coming soon...
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;
