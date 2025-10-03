import api from './api';

export interface Invitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  inviterUsername?: string;
  inviterDisplayName?: string;
  email: string;
  token?: string;
  role: 'member' | 'admin';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface InvitationDetails extends Invitation {
  workspaceName: string;
  workspaceSlug: string;
  workspaceLogo?: string;
}

export const invitationService = {
  async createInvitation(workspaceId: string, email: string, role: 'member' | 'admin' = 'member'): Promise<Invitation> {
    const response = await api.post<Invitation>(`/workspaces/${workspaceId}/invitations`, {
      email,
      role,
    });
    return response.data;
  },

  async getInvitations(workspaceId: string): Promise<Invitation[]> {
    const response = await api.get<{ invitations: Invitation[] }>(`/workspaces/${workspaceId}/invitations`);
    return response.data.invitations;
  },

  async revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`);
  },

  async getInvitationByToken(token: string): Promise<InvitationDetails> {
    const response = await api.get<InvitationDetails>(`/workspaces/invitations/token/${token}`);
    return response.data;
  },

  async acceptInvitation(token: string): Promise<{ workspace: any }> {
    const response = await api.post<{ workspace: any }>(`/workspaces/invitations/token/${token}/accept`);
    return response.data;
  },
};
