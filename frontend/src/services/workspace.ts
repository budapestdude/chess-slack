import api from './api';
import { Workspace } from '../types';

export const workspaceService = {
  async createWorkspace(name: string, slug: string, description?: string): Promise<Workspace> {
    const response = await api.post<Workspace>('/workspaces', {
      name,
      slug,
      description,
    });
    return response.data;
  },

  async getWorkspaces(): Promise<Workspace[]> {
    const response = await api.get<{ workspaces: Workspace[] }>('/workspaces');
    return response.data.workspaces;
  },

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await api.get<Workspace>(`/workspaces/${workspaceId}`);
    return response.data;
  },

  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<Workspace> {
    const response = await api.put<Workspace>(`/workspaces/${workspaceId}`, updates);
    return response.data;
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}`);
  },

  async getWorkspaceMembers(workspaceId: string, search?: string): Promise<any[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get<{ members: any[] }>(`/workspaces/${workspaceId}/members${params}`);
    return response.data.members;
  },
};