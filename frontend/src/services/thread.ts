import api from './api';
import { Message } from '../types';

export interface ThreadData {
  parentMessage: Message;
  replies: Message[];
}

export const threadService = {
  async getThreadReplies(
    workspaceId: string,
    channelId: string,
    messageId: string
  ): Promise<ThreadData> {
    const response = await api.get<ThreadData>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/thread`
    );
    return response.data;
  },

  async postThreadReply(
    workspaceId: string,
    channelId: string,
    messageId: string,
    content: string
  ): Promise<Message> {
    const response = await api.post<Message>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages`,
      {
        content,
        parentMessageId: messageId,
      }
    );
    return response.data;
  },
};