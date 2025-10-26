import api from './api';

export interface Task {
  id: string;
  workspace_id: string;
  project_id?: string;
  section_id?: string;
  parent_task_id?: string;
  title: string;
  description?: string;
  task_type?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  assigned_to_user_id?: string;
  assigned_to_agent_id?: string;
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  position: number;
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at: string;
  assigned_user_name?: string;
  assigned_user_email?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  project_id?: string;
  section_id?: string;
  assigned_to_user_id?: string;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: string;
  section_id?: string;
  position?: number;
  assigned_to_user_id?: string;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
}

class TaskService {
  async createTask(workspaceId: string, data: CreateTaskData): Promise<Task> {
    const response = await api.post(`/api/workspaces/${workspaceId}/tasks`, data);
    return response.data;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    const response = await api.get(`/api/projects/${projectId}/tasks`);
    return response.data;
  }

  async getTasksBySection(sectionId: string): Promise<Task[]> {
    const response = await api.get(`/api/sections/${sectionId}/tasks`);
    return response.data;
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await api.get(`/api/tasks/${taskId}`);
    return response.data;
  }

  async updateTask(taskId: string, data: UpdateTaskData): Promise<Task> {
    const response = await api.put(`/api/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/api/tasks/${taskId}`);
  }

  async moveTaskToSection(taskId: string, sectionId: string, position?: number): Promise<Task> {
    const response = await api.post(`/api/tasks/${taskId}/move`, { section_id: sectionId, position });
    return response.data;
  }

  async reorderTasks(sectionId: string, taskIds: string[]): Promise<void> {
    await api.post(`/api/sections/${sectionId}/tasks/reorder`, { task_ids: taskIds });
  }

  async completeTask(taskId: string): Promise<Task> {
    const response = await api.post(`/api/tasks/${taskId}/complete`);
    return response.data;
  }

  async uncompleteTask(taskId: string): Promise<Task> {
    const response = await api.post(`/api/tasks/${taskId}/uncomplete`);
    return response.data;
  }
}

export default new TaskService();
