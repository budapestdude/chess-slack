import api from './api';

export interface Draft {
  id: string;
  workspaceId: string;
  channelId?: string;
  dmGroupId?: string;
  userId: string;
  content: string;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  channelName?: string;
}

export const draftService = {
  async saveDraft(
    workspaceId: string,
    content: string,
    channelId?: string,
    dmGroupId?: string,
    metadata?: Record<string, any>,
    scheduledAt?: Date
  ): Promise<Draft> {
    const response = await api.post(`/workspaces/${workspaceId}/drafts`, {
      channelId,
      dmGroupId,
      content,
      metadata,
      scheduledAt: scheduledAt?.toISOString(),
    });
    return response.data;
  },

  async getDrafts(workspaceId: string): Promise<Draft[]> {
    const response = await api.get<{ drafts: Draft[] }>(`/workspaces/${workspaceId}/drafts`);
    return response.data.drafts;
  },

  async getDraft(workspaceId: string, channelId?: string, dmGroupId?: string): Promise<Draft | null> {
    try {
      const params: any = { workspaceId };
      if (channelId) params.channelId = channelId;
      if (dmGroupId) params.dmGroupId = dmGroupId;

      const response = await api.get(`/workspaces/${workspaceId}/draft`, { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async deleteDraft(workspaceId: string, draftId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/drafts/${draftId}`);
  },

  async deleteDraftByLocation(workspaceId: string, channelId?: string, dmGroupId?: string): Promise<void> {
    const params: any = { workspaceId };
    if (channelId) params.channelId = channelId;
    if (dmGroupId) params.dmGroupId = dmGroupId;

    await api.delete(`/workspaces/${workspaceId}/draft`, { params });
  },
};
