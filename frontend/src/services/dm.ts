import api from './api';

export interface DMGroup {
  id: string;
  workspaceId: string;
  isGroup: boolean;
  members: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    status: string;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    username: string;
  };
  unreadCount?: number;
  createdAt: string;
}

export interface DMMessage {
  id: string;
  workspaceId: string;
  dmGroupId: string;
  userId: string;
  content: string;
  messageType: 'text' | 'file' | 'system' | 'chess_game';
  metadata: any;
  parentMessageId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  replyCount: number;
  lastReplyAt?: string;
  hasAttachments: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  reactions?: any[];
  attachments?: any[];
}

export const dmService = {
  async getOrCreateDM(workspaceId: string, userIds: string[]): Promise<DMGroup> {
    const response = await api.post('/dms/create', {
      workspaceId,
      userIds,
    });
    return response.data;
  },

  async getUserDMs(workspaceId: string): Promise<DMGroup[]> {
    const response = await api.get(`/dms/workspace/${workspaceId}`);
    return response.data;
  },

  async getDMMessages(
    dmGroupId: string,
    limit = 50,
    before?: string
  ): Promise<{ messages: DMMessage[]; hasMore: boolean }> {
    const params: any = { limit };
    if (before) {
      params.before = before;
    }
    const response = await api.get(`/dms/${dmGroupId}/messages`, { params });
    return response.data;
  },

  async sendDMMessage(
    dmGroupId: string,
    content: string,
    parentMessageId?: string
  ): Promise<DMMessage> {
    const response = await api.post(`/dms/${dmGroupId}/messages`, {
      content,
      parentMessageId,
    });
    return response.data;
  },
};