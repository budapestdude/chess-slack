import api from './api';

export interface SearchResults {
  query: string;
  results: {
    messages: Array<{
      id: string;
      content: string;
      channelId: string;
      channelName: string;
      createdAt: string;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
      };
      relevance: number;
    }>;
    channels: Array<{
      id: string;
      name: string;
      description?: string;
      topic?: string;
      isPrivate: boolean;
      isMember: boolean;
      createdAt: string;
      relevance: number;
    }>;
    users: Array<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      status: string;
      relevance: number;
    }>;
  };
  totalResults: number;
}

export const search = async (
  workspaceId: string,
  query: string,
  options?: {
    type?: 'messages' | 'channels' | 'users' | 'all';
    limit?: number;
    offset?: number;
  }
): Promise<SearchResults> => {
  const response = await api.get(`/workspaces/${workspaceId}/search`, {
    params: {
      query,
      ...(options || {}),
    },
  });
  return response.data;
};

export const searchMessages = async (
  workspaceId: string,
  channelId: string,
  query: string
): Promise<{ query: string; messages: any[]; totalResults: number }> => {
  const response = await api.get(`/workspaces/${workspaceId}/channels/${channelId}/search`, {
    params: { query },
  });
  return response.data;
};

export default { search, searchMessages };