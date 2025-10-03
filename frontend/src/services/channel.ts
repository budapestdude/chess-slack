import api from './api';
import { Channel } from '../types';

export const channelService = {
  async createChannel(
    workspaceId: string,
    name: string,
    description?: string,
    isPrivate = false
  ): Promise<Channel> {
    const response = await api.post<Channel>(`/workspaces/${workspaceId}/channels`, {
      name,
      description,
      isPrivate,
    });
    return response.data;
  },

  async getChannels(workspaceId: string): Promise<Channel[]> {
    const response = await api.get<{ channels: Channel[] }>(`/workspaces/${workspaceId}/channels`);
    return response.data.channels;
  },

  async getChannel(workspaceId: string, channelId: string): Promise<Channel> {
    const response = await api.get<Channel>(`/workspaces/${workspaceId}/channels/${channelId}`);
    return response.data;
  },

  async updateChannel(
    workspaceId: string,
    channelId: string,
    updates: Partial<Channel>
  ): Promise<Channel> {
    const response = await api.put<Channel>(
      `/workspaces/${workspaceId}/channels/${channelId}`,
      updates
    );
    return response.data;
  },

  async deleteChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
  },

  async joinChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/join`);
  },

  async leaveChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/leave`);
  },

  async muteChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/mute`);
  },

  async unmuteChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/unmute`);
  },

  async browseChannels(workspaceId: string): Promise<Channel[]> {
    const response = await api.get<{ channels: Channel[] }>(`/workspaces/${workspaceId}/channels/browse/all`);
    return response.data.channels;
  },

  async starChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/star`);
  },

  async unstarChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/channels/${channelId}/star`);
  },

  async getStarredChannels(workspaceId: string): Promise<Channel[]> {
    const response = await api.get<{ starredChannels: Channel[] }>(`/workspaces/${workspaceId}/channels/starred/list`);
    return response.data.starredChannels;
  },
};