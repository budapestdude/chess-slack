import api from './api';
import {
  AgentTask,
  TaskLabel,
  TaskComment,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../types/agent';

export const taskService = {
  // Task Management
  async createTask(workspaceId: string, data: CreateTaskRequest): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks`, data);
    return response.data.task;
  },

  async getTasks(workspaceId: string, filters?: any): Promise<AgentTask[]> {
    const response = await api.get(`/workspaces/${workspaceId}/tasks`, { params: filters });
    return response.data.tasks;
  },

  async getTask(workspaceId: string, taskId: string): Promise<AgentTask> {
    const response = await api.get(`/workspaces/${workspaceId}/tasks/${taskId}`);
    return response.data.task;
  },

  async updateTask(workspaceId: string, taskId: string, data: UpdateTaskRequest): Promise<AgentTask> {
    const response = await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data);
    return response.data.task;
  },

  async deleteTask(workspaceId: string, taskId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
  },

  async assignTaskToUser(workspaceId: string, taskId: string, userId: string): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/assign-user`, { userId });
    return response.data.task;
  },

  async startTask(workspaceId: string, taskId: string): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/start`);
    return response.data.task;
  },

  async completeTask(workspaceId: string, taskId: string): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/complete`);
    return response.data.task;
  },

  async cancelTask(workspaceId: string, taskId: string): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/cancel`);
    return response.data.task;
  },

  // Label Management
  async addLabel(workspaceId: string, taskId: string, labelData: { name: string; color: string }): Promise<TaskLabel> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/labels`, labelData);
    return response.data.label;
  },

  async removeLabel(workspaceId: string, taskId: string, labelId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/labels/${labelId}`);
  },

  async getLabels(workspaceId: string, taskId: string): Promise<TaskLabel[]> {
    const response = await api.get(`/workspaces/${workspaceId}/tasks/${taskId}/labels`);
    return response.data.labels;
  },

  // Comment Management
  async getComments(workspaceId: string, taskId: string): Promise<TaskComment[]> {
    const response = await api.get(`/workspaces/${workspaceId}/tasks/${taskId}/comments`);
    return response.data.comments;
  },

  async addComment(workspaceId: string, taskId: string, content: string): Promise<TaskComment> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, { content });
    return response.data.comment;
  },

  async updateComment(workspaceId: string, taskId: string, commentId: string, content: string): Promise<TaskComment> {
    const response = await api.put(`/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`, { content });
    return response.data.comment;
  },

  async deleteComment(workspaceId: string, taskId: string, commentId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`);
  },
};

export default taskService;
