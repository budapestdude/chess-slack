import api from './api';

export interface ArchivedChannel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  archivedAt: string;
  archivedBy: {
    id: string;
    username: string;
    displayName: string;
  } | null;
  messageCount: number;
}

export interface ChannelExport {
  channel: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
  };
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    user: {
      id: string;
      username: string;
      displayName: string;
    };
    attachments: Array<{
      id: string;
      filename: string;
      file_size: number;
    }>;
  }>;
  exportedAt: string;
  exportedBy: string;
}

export const archiveService = {
  async archiveChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/archive`);
  },

  async unarchiveChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/unarchive`);
  },

  async getArchivedChannels(workspaceId: string): Promise<ArchivedChannel[]> {
    const response = await api.get<{ archivedChannels: ArchivedChannel[] }>(
      `/workspaces/${workspaceId}/channels/archived/list`
    );
    return response.data.archivedChannels;
  },

  async exportChannelHistory(workspaceId: string, channelId: string): Promise<ChannelExport> {
    const response = await api.get<ChannelExport>(
      `/workspaces/${workspaceId}/channels/${channelId}/export`
    );
    return response.data;
  },

  downloadExportAsJSON(channelExport: ChannelExport, channelName: string): void {
    const dataStr = JSON.stringify(channelExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${channelName}-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
