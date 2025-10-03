import api from './api';
import { Message } from '../types';

export interface BookmarkedMessage {
  bookmarkId: string;
  note?: string;
  bookmarkedAt: string;
  message: Message & {
    channelName?: string;
    channelIsPrivate?: boolean;
  };
}

export const bookmarksService = {
  async bookmarkMessage(messageId: string, note?: string): Promise<void> {
    await api.post(`/messages/${messageId}/bookmark`, { note });
  },

  async unbookmarkMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}/bookmark`);
  },

  async getBookmarkedMessages(workspaceId: string): Promise<BookmarkedMessage[]> {
    const response = await api.get<{ bookmarkedMessages: BookmarkedMessage[] }>(
      `/workspaces/${workspaceId}/bookmarked-messages`
    );
    return response.data.bookmarkedMessages;
  },
};