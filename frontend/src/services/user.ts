import api from './api';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  customStatus?: string;
  statusEmoji?: string;
  bio?: string;
  timezone?: string;
  presenceStatus: 'online' | 'away' | 'busy' | 'offline';
  lastActivity?: string;
  createdAt: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  timezone?: string;
  avatarUrl?: string;
}

export interface SetStatusData {
  customStatus?: string;
  statusEmoji?: string;
}

export interface DndSettings {
  dndStart?: string; // HH:MM format
  dndEnd?: string; // HH:MM format
  timezone?: string;
}

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  async updateMyProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await api.put('/users/me/profile', data);
    return response.data;
  },

  async setCustomStatus(data: SetStatusData): Promise<void> {
    await api.put('/users/me/status', data);
  },

  async setPresence(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    await api.put('/users/me/presence', { status });
  },

  async getDndSettings(): Promise<DndSettings> {
    const response = await api.get('/users/me/dnd');
    return response.data;
  },

  async setDndSettings(data: DndSettings): Promise<DndSettings> {
    const response = await api.put('/users/me/dnd', data);
    return response.data;
  },

  async uploadAvatar(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAvatarUrl(): string {
    return `/api/users/me/avatar?t=${Date.now()}`;
  },
};