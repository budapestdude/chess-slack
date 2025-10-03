import api from './api';

export interface SearchFilters {
  fromUser?: string;
  inChannel?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachment?: boolean;
  type?: 'messages' | 'channels' | 'users' | 'all';
}

export interface SearchResults {
  query: string;
  results: {
    messages: Array<{
      id: string;
      content: string;
      channelId: string;
      channelName: string;
      createdAt: string;
      hasAttachment?: boolean;
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

export interface SavedSearch {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  query: string;
  filters?: SearchFilters;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchHistory {
  query: string;
  resultCount: number;
  searchedAt: Date;
}

export const search = async (
  workspaceId: string,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
  } & SearchFilters
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

export const createSavedSearch = async (
  workspaceId: string,
  name: string,
  query: string,
  filters?: SearchFilters
): Promise<SavedSearch> => {
  const response = await api.post(`/workspaces/${workspaceId}/saved-searches`, {
    name,
    query,
    filters,
  });
  return response.data;
};

export const getSavedSearches = async (workspaceId: string): Promise<SavedSearch[]> => {
  const response = await api.get<{ savedSearches: SavedSearch[] }>(`/workspaces/${workspaceId}/saved-searches`);
  return response.data.savedSearches;
};

export const deleteSavedSearch = async (workspaceId: string, savedSearchId: string): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}/saved-searches/${savedSearchId}`);
};

export const getSearchHistory = async (workspaceId: string, limit = 10): Promise<SearchHistory[]> => {
  const response = await api.get<{ searchHistory: SearchHistory[] }>(`/workspaces/${workspaceId}/search-history`, {
    params: { limit },
  });
  return response.data.searchHistory;
};

export default {
  search,
  searchMessages,
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
  getSearchHistory
};