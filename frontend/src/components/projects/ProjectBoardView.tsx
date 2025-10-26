import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Project, ProjectSection } from '../../services/projectService';
import taskService, { Task, CreateTaskData } from '../../services/taskService';
import projectService from '../../services/projectService';
import CreateTaskModal from './CreateTaskModal';
import TaskCard from './TaskCard';
import toast from 'react-hot-toast';

interface ProjectBoardViewProps {
  project: Project;
  onUpdate: () => void;
}

const ItemTypes = {
  TASK: 'task',
};

interface DragItem {
  id: string;
  sectionId: string;
  type: string;
}

const BoardColumn: React.FC<{
  section: ProjectSection;
  tasks: Task[];
  onDrop: (taskId: string, newSectionId: string) => void;
  onAddTask: () => void;
  onDeleteSection: () => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onDeleteTask: (taskId: string) => void;
}> = ({ section, tasks, onDrop, onAddTask, onDeleteSection, onUpdateTask, onDeleteTask }) => {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: (item: DragItem) => {
      if (item.sectionId !== section.id) {
        onDrop(item.id, section.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 bg-gray-100 rounded-lg flex flex-col transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-semibold text-gray-900">{section.name}</h3>
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onAddTask}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Add task"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={onDeleteSection}
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-2">No tasks</p>
            <button
              onClick={onAddTask}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add a task
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              sectionId={section.id}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
};

const DraggableTaskCard: React.FC<{
  task: Task;
  sectionId: string;
  onUpdate: (taskId: string, updates: any) => void;
  onDelete: (taskId: string) => void;
}> = ({ task, sectionId, onUpdate, onDelete }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { id: task.id, sectionId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <TaskCard task={task} onUpdate={onUpdate} onDelete={onDelete} />
    </div>
  );
};

const ProjectBoardView: React.FC<ProjectBoardViewProps> = ({ project, onUpdate }) => {
  const [sections, setSections] = useState<ProjectSection[]>(project.sections || []);
  const [tasksBySection, setTasksBySection] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  useEffect(() => {
    if (project.sections) {
      setSections(project.sections);
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

  const handleDropTask = async (taskId: string, newSectionId: string) => {
    try {
      await taskService.moveTaskToSection(taskId, newSectionId);
      toast.success('Task moved');
      loadTasks();
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
    }
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
    if (!window.confirm('Delete this task?')) return;

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
    <DndProvider backend={HTML5Backend}>
      <div className="h-full overflow-x-auto p-6">
        <div className="flex space-x-4 min-h-full">
          {/* Columns */}
          {sections.map((section) => (
            <BoardColumn
              key={section.id}
              section={section}
              tasks={tasksBySection[section.id] || []}
              onDrop={handleDropTask}
              onAddTask={() => setShowCreateTask(section.id)}
              onDeleteSection={() => handleDeleteSection(section.id)}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}

          {/* Add Section Column */}
          <div className="flex-shrink-0 w-80">
            {showAddSection ? (
              <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
                  placeholder="Section name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddSection}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSection(false);
                      setNewSectionName('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSection(true)}
                className="w-full h-full min-h-[120px] bg-gray-50 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            )}
          </div>
        </div>

        {/* Create Task Modal */}
        {showCreateTask && (
          <CreateTaskModal
            sectionName={sections.find(s => s.id === showCreateTask)?.name || ''}
            onClose={() => setShowCreateTask(null)}
            onCreate={(data) => handleCreateTask(showCreateTask, data)}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default ProjectBoardView;
