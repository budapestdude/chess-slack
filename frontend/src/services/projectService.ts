import api from './api';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  owner_id: string;
  default_view: 'list' | 'board' | 'timeline' | 'calendar';
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  user_role?: string;
  owner_name?: string;
  owner_email?: string;
  active_tasks?: number;
  completed_tasks?: number;
  sections?: ProjectSection[];
  members?: ProjectMember[];
}

export interface ProjectSection {
  id: string;
  project_id: string;
  name: string;
  position: number;
  task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  username?: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

export interface CreateProjectData {
  workspace_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  default_view?: 'list' | 'board' | 'timeline' | 'calendar';
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  default_view?: 'list' | 'board' | 'timeline' | 'calendar';
}

class ProjectService {
  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await api.post('/projects', data);
    return response.data;
  }

  async getProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
    const response = await api.get(`/workspaces/${workspaceId}/projects`);
    return response.data;
  }

  async getProjectById(projectId: string): Promise<Project> {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data;
  }

  async updateProject(projectId: string, data: UpdateProjectData): Promise<Project> {
    const response = await api.put(`/api/projects/${projectId}`, data);
    return response.data;
  }

  async archiveProject(projectId: string): Promise<void> {
    await api.post(`/api/projects/${projectId}/archive`);
  }

  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}`);
  }

  async addMember(projectId: string, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<ProjectMember> {
    const response = await api.post(`/api/projects/${projectId}/members`, { user_id: userId, role });
    return response.data;
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}/members/${userId}`);
  }

  async updateMemberRole(projectId: string, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<ProjectMember> {
    const response = await api.put(`/api/projects/${projectId}/members/${userId}/role`, { role });
    return response.data;
  }

  async createSection(projectId: string, name: string, position?: number): Promise<ProjectSection> {
    const response = await api.post(`/api/projects/${projectId}/sections`, { name, position });
    return response.data;
  }

  async updateSection(sectionId: string, name?: string, position?: number): Promise<ProjectSection> {
    const response = await api.put(`/api/sections/${sectionId}`, { name, position });
    return response.data;
  }

  async deleteSection(sectionId: string): Promise<void> {
    await api.delete(`/api/sections/${sectionId}`);
  }

  async reorderSections(projectId: string, sectionIds: string[]): Promise<void> {
    await api.post(`/api/projects/${projectId}/sections/reorder`, { section_ids: sectionIds });
  }
}

export default new ProjectService();
