import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import taskService from '../services/task';
import { workspaceService } from '../services/workspace';
import { AgentTask, CreateTaskRequest, TaskPriority, TaskType, TaskLabel, TaskComment } from '../types/agent';
import { User } from '../types';

export default function TaskBoardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [newTask, setNewTask] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    priority: 'medium',
    taskType: 'feature',
    requirements: [],
  });
  const [newComment, setNewComment] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, membersData] = await Promise.all([
        taskService.getTasks(workspaceId!),
        workspaceService.getWorkspaceMembers(workspaceId!),
      ]);
      setTasks(tasksData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await taskService.createTask(workspaceId!, newTask);
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', priority: 'medium', taskType: 'feature', requirements: [] });
      loadData();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleAssignTaskToUser = async (taskId: string, userId: string) => {
    try {
      await taskService.assignTaskToUser(workspaceId!, taskId, userId);
      loadData();
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getTask(workspaceId!, taskId);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
      alert('Failed to assign task: ' + (error as any).response?.data?.error || 'Unknown error');
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await taskService.startTask(workspaceId!, taskId);
      loadData();
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getTask(workspaceId!, taskId);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('Failed to start task:', error);
      alert('Failed to start task: ' + (error as any).response?.data?.error || 'Unknown error');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to cancel this task?')) {
      try {
        await taskService.cancelTask(workspaceId!, taskId);
        loadData();
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }
      } catch (error) {
        console.error('Failed to cancel task:', error);
      }
    }
  };

  const handleAddLabel = async () => {
    if (!selectedTask || !newLabelName.trim()) return;
    try {
      await taskService.addLabel(workspaceId!, selectedTask.id, {
        name: newLabelName,
        color: newLabelColor,
      });
      const updatedTask = await taskService.getTask(workspaceId!, selectedTask.id);
      setSelectedTask(updatedTask);
      setNewLabelName('');
      setNewLabelColor('#3B82F6');
      setShowLabelForm(false);
      loadData();
    } catch (error) {
      console.error('Failed to add label:', error);
    }
  };

  const handleRemoveLabel = async (labelId: string) => {
    if (!selectedTask) return;
    try {
      await taskService.removeLabel(workspaceId!, selectedTask.id, labelId);
      const updatedTask = await taskService.getTask(workspaceId!, selectedTask.id);
      setSelectedTask(updatedTask);
      loadData();
    } catch (error) {
      console.error('Failed to remove label:', error);
    }
  };

  const loadComments = async (taskId: string) => {
    try {
      const commentsData = await taskService.getComments(workspaceId!, taskId);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    try {
      await taskService.addComment(workspaceId!, selectedTask.id, newComment);
      setNewComment('');
      loadComments(selectedTask.id);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask) return;
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await taskService.deleteComment(workspaceId!, selectedTask.id, commentId);
        loadComments(selectedTask.id);
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };

  useEffect(() => {
    if (selectedTask) {
      loadComments(selectedTask.id);
    }
  }, [selectedTask?.id]);

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTaskTypeIcon = (type?: TaskType) => {
    switch (type) {
      case 'feature': return '✨';
      case 'bug': return '🐛';
      case 'refactor': return '♻️';
      case 'test': return '🧪';
      case 'documentation': return '📝';
      case 'review': return '👀';
      default: return '📋';
    }
  };

  const getAssignedUser = (task: AgentTask) => {
    if (task.assignedUser) return task.assignedUser;
    return members.find(member => member.id === task.assignedToUserId);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLabelColors = () => [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E'
  ];

  const columns = [
    { id: 'pending', title: 'Pending', color: 'bg-gray-200' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-200' },
    { id: 'blocked', title: 'Blocked', color: 'bg-red-200' },
    { id: 'completed', title: 'Completed', color: 'bg-green-200' },
    { id: 'failed', title: 'Failed', color: 'bg-red-300' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
            <p className="text-gray-600 mt-1">Manage and track agent tasks</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span>
            Create Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
                <div className={`${column.color} rounded-t-lg px-4 py-3 font-semibold flex justify-between items-center`}>
                  <span>{column.title}</span>
                  <span className="bg-white px-2 py-1 rounded text-sm">{columnTasks.length}</span>
                </div>
                <div className="bg-gray-50 rounded-b-lg p-2 flex-1 overflow-y-auto space-y-2">
                  {columnTasks.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">No tasks</div>
                  ) : (
                    columnTasks.map((task) => {
                      const assignedUser = getAssignedUser(task);
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow cursor-pointer border-l-4"
                          style={{ borderLeftColor: task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f97316' : task.priority === 'medium' ? '#eab308' : '#22c55e' }}
                        >
                          {/* Task Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getTaskTypeIcon(task.taskType)}</span>
                              <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>

                          {/* Task Title */}
                          <h3 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h3>

                          {/* Task Description */}
                          {task.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                          )}

                          {/* Labels */}
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {task.labels.slice(0, 3).map((label) => (
                                <span
                                  key={label.id}
                                  className="text-xs px-2 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: label.color }}
                                >
                                  {label.name}
                                </span>
                              ))}
                              {task.labels.length > 3 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                                  +{task.labels.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Assigned User */}
                          {assignedUser && (
                            <div className="flex items-center gap-2 mb-2">
                              {assignedUser.avatarUrl ? (
                                <img
                                  src={assignedUser.avatarUrl}
                                  alt={assignedUser.displayName}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {getUserInitials(assignedUser.displayName)}
                                </div>
                              )}
                              <span className="text-xs text-gray-700">{assignedUser.displayName}</span>
                            </div>
                          )}

                          {/* Task Meta */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t">
                            <span>{task.taskType}</span>
                            <div className="flex items-center gap-2">
                              {task.comments && task.comments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <span>💬</span>
                                  <span>{task.comments.length}</span>
                                </span>
                              )}
                              {task.estimatedEffort && <span>{task.estimatedEffort}m</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
              <form onSubmit={handleCreateTask}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Task Title</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Build authentication system"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Describe what needs to be done..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Priority</label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Task Type</label>
                      <select
                        value={newTask.taskType}
                        onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value as TaskType })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="feature">Feature</option>
                        <option value="bug">Bug Fix</option>
                        <option value="refactor">Refactor</option>
                        <option value="test">Test</option>
                        <option value="documentation">Documentation</option>
                        <option value="review">Review</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estimated Effort (minutes)</label>
                    <input
                      type="number"
                      value={newTask.estimatedEffort || ''}
                      onChange={(e) => setNewTask({ ...newTask, estimatedEffort: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="60"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setShowLabelForm(false);
                    setNewComment('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="col-span-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                    <span className="text-gray-600">{selectedTask.taskType}</span>
                    <span className="text-gray-500 text-sm capitalize">{selectedTask.status.replace('_', ' ')}</span>
                  </div>

                  {selectedTask.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-gray-700">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Labels Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Labels</h3>
                      <button
                        onClick={() => setShowLabelForm(!showLabelForm)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {showLabelForm ? 'Cancel' : '+ Add Label'}
                      </button>
                    </div>

                    {showLabelForm && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          placeholder="Label name"
                          className="w-full px-3 py-2 border rounded-lg mb-2"
                        />
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600">Color:</span>
                          <div className="flex flex-wrap gap-1">
                            {getLabelColors().map((color) => (
                              <button
                                key={color}
                                onClick={() => setNewLabelColor(color)}
                                className={`w-6 h-6 rounded ${newLabelColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handleAddLabel}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add Label
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {selectedTask.labels && selectedTask.labels.length > 0 ? (
                        selectedTask.labels.map((label) => (
                          <span
                            key={label.id}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-sm"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                            <button
                              onClick={() => handleRemoveLabel(label.id)}
                              className="hover:bg-white hover:bg-opacity-20 rounded-full w-4 h-4 flex items-center justify-center"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">No labels</span>
                      )}
                    </div>
                  </div>

                  {selectedTask.requirements.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Requirements</h3>
                      <ul className="list-disc list-inside text-gray-700">
                        {selectedTask.requirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Comments ({comments.length})</h3>

                    {/* Add Comment */}
                    <div className="mb-4">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full px-3 py-2 border rounded-lg resize-none"
                        rows={3}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add Comment
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {comments.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No comments yet</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              {comment.user?.avatarUrl ? (
                                <img
                                  src={comment.user.avatarUrl}
                                  alt={comment.user.displayName}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {comment.user ? getUserInitials(comment.user.displayName) : '?'}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{comment.user?.displayName || 'Unknown User'}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{comment.content}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-400 hover:text-red-600 text-sm"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Assigned To</h3>
                    {getAssignedUser(selectedTask) ? (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        {getAssignedUser(selectedTask)?.avatarUrl ? (
                          <img
                            src={getAssignedUser(selectedTask)!.avatarUrl}
                            alt={getAssignedUser(selectedTask)!.displayName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {getUserInitials(getAssignedUser(selectedTask)!.displayName)}
                          </div>
                        )}
                        <span className="text-sm">{getAssignedUser(selectedTask)?.displayName}</span>
                      </div>
                    ) : (
                      <select
                        onChange={(e) => e.target.value && handleAssignTaskToUser(selectedTask.id, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        defaultValue=""
                      >
                        <option value="" disabled>Select user...</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedTask.estimatedEffort && (
                    <div>
                      <h3 className="font-semibold mb-2">Estimated Effort</h3>
                      <p className="text-gray-700">{selectedTask.estimatedEffort} minutes</p>
                    </div>
                  )}

                  {selectedTask.dueDate && (
                    <div>
                      <h3 className="font-semibold mb-2">Due Date</h3>
                      <p className="text-gray-700">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    {selectedTask.status === 'pending' && (
                      <button
                        onClick={() => handleStartTask(selectedTask.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Start Task
                      </button>
                    )}
                    {(selectedTask.status === 'pending' || selectedTask.status === 'in_progress') && (
                      <button
                        onClick={() => handleCancelTask(selectedTask.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Cancel Task
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
