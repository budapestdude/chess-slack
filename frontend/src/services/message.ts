import api from './api';
import { Message } from '../types';

export const messageService = {
  async sendMessage(
    workspaceId: string,
    channelId: string,
    content: string,
    parentMessageId?: string
  ): Promise<Message> {
    const response = await api.post<Message>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages`,
      { content, parentMessageId }
    );
    return response.data;
  },

  async getMessages(
    workspaceId: string,
    channelId: string,
    limit = 50,
    before?: string
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);

    const response = await api.get<{ messages: Message[]; hasMore: boolean }>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages?${params.toString()}`
    );
    return response.data;
  },

  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await api.put<Message>(`/workspaces/messages/${messageId}`, { content });
    return response.data;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/workspaces/messages/${messageId}`);
  },

  async addReaction(messageId: string, emoji: string): Promise<void> {
    await api.post(`/workspaces/messages/${messageId}/reactions`, { emoji });
  },

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    await api.delete(`/workspaces/messages/${messageId}/reactions?emoji=${emoji}`);
  },

  async pinMessage(messageId: string): Promise<void> {
    await api.post(`/workspaces/messages/${messageId}/pin`);
  },

  async unpinMessage(messageId: string): Promise<void> {
    await api.delete(`/workspaces/messages/${messageId}/pin`);
  },

  async getPinnedMessages(workspaceId: string, channelId: string): Promise<{ pinnedMessages: Message[] }> {
    const response = await api.get<{ pinnedMessages: Message[] }>(
      `/workspaces/${workspaceId}/channels/${channelId}/pinned-messages`
    );
    return response.data;
  },
};