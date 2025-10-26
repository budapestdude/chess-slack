import React, { useState, useEffect } from 'react';
import { Project, ProjectSection } from '../../services/projectService';
import taskService, { Task, CreateTaskData } from '../../services/taskService';
import projectService from '../../services/projectService';
import TaskRow from './TaskRow';
import CreateTaskModal from './CreateTaskModal';
import toast from 'react-hot-toast';

interface ProjectListViewProps {
  project: Project;
  onUpdate: () => void;
}

const ProjectListView: React.FC<ProjectListViewProps> = ({ project, onUpdate }) => {
  const [sections, setSections] = useState<ProjectSection[]>(project.sections || []);
  const [tasksBySection, setTasksBySection] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  useEffect(() => {
    if (project.sections) {
      setSections(project.sections);
      // Expand all sections by default
      setExpandedSections(new Set(project.sections.map(s => s.id)));
      loadTasks();
    }
  }, [project]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const tasks = await taskService.getTasksByProject(project.id);

      // Group tasks by section
      const grouped: Record<string, Task[]> = {};
      tasks.forEach(task => {
        const sectionId = task.section_id || 'unsectioned';
        if (!grouped[sectionId]) {
          grouped[sectionId] = [];
        }
        grouped[sectionId].push(task);
      });

      // Sort tasks by position
      Object.keys(grouped).forEach(sectionId => {
        grouped[sectionId].sort((a, b) => a.position - b.position);
      });

      setTasksBySection(grouped);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleCreateTask = async (sectionId: string, data: CreateTaskData) => {
    try {
      await taskService.createTask(project.workspace_id, {
        ...data,
        project_id: project.id,
        section_id: sectionId,
      });
      toast.success('Task created');
      setShowCreateTask(null);
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      await taskService.updateTask(taskId, updates);
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      toast.success('Task deleted');
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;

    try {
      await projectService.createSection(project.id, newSectionName);
      toast.success('Section created');
      setNewSectionName('');
      setShowAddSection(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating section:', error);
      toast.error('Failed to create section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Delete this section? Tasks will be moved to "Unsectioned".')) {
      return;
    }

    try {
      await projectService.deleteSection(sectionId);
      toast.success('Section deleted');
      onUpdate();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Sections */}
        {sections.map((section) => {
          const tasks = tasksBySection[section.id] || [];
          const isExpanded = expandedSections.has(section.id);

          return (
            <div key={section.id} className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Section Header */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center flex-1 text-left hover:bg-gray-100 rounded px-2 py-1 -mx-2 transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 mr-2 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-gray-900">{section.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({tasks.length})</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowCreateTask(section.id)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Add task"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete section"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {tasks.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <p className="mb-2">No tasks in this section</p>
                      <button
                        onClick={() => setShowCreateTask(section.id)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        + Add a task
                      </button>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Create Task Modal */}
              {showCreateTask === section.id && (
                <CreateTaskModal
                  sectionName={section.name}
                  onClose={() => setShowCreateTask(null)}
                  onCreate={(data) => handleCreateTask(section.id, data)}
                />
              )}
            </div>
          );
        })}

        {/* Add Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {showAddSection ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
                placeholder="Section name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleAddSection}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddSection(false);
                  setNewSectionName('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Section
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectListView;
