import api from './api';

// ============ SPONSORS ============

export interface Sponsor {
  id: string;
  workspace_id: string;
  name: string;
  tier: 'gold' | 'silver' | 'bronze' | 'custom';
  logo_url?: string;
  website_url?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contribution_amount?: number;
  benefits?: string;
  notes?: string;
  status: string;
  created_by: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSponsorData {
  name: string;
  tier?: 'gold' | 'silver' | 'bronze' | 'custom';
  logoUrl?: string;
  websiteUrl?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contributionAmount?: number;
  benefits?: string;
  notes?: string;
}

export const getSponsors = async (workspaceId: string): Promise<Sponsor[]> => {
  const response = await api.get(`/marketing/${workspaceId}/sponsors`);
  return response.data.sponsors;
};

export const createSponsor = async (workspaceId: string, data: CreateSponsorData): Promise<Sponsor> => {
  const response = await api.post(`/marketing/${workspaceId}/sponsors`, data);
  return response.data;
};

export const updateSponsor = async (
  workspaceId: string,
  sponsorId: string,
  data: Partial<CreateSponsorData>
): Promise<Sponsor> => {
  const response = await api.put(`/marketing/${workspaceId}/sponsors/${sponsorId}`, data);
  return response.data;
};

export const deleteSponsor = async (workspaceId: string, sponsorId: string): Promise<void> => {
  await api.delete(`/marketing/${workspaceId}/sponsors/${sponsorId}`);
};

// ============ EMAIL CAMPAIGNS ============

export interface EmailCampaign {
  id: string;
  workspace_id: string;
  name: string;
  subject: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  sent_count: number;
  created_by: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailCampaignData {
  name: string;
  subject: string;
  body: string;
  scheduledAt?: string;
}

export const getEmailCampaigns = async (workspaceId: string): Promise<EmailCampaign[]> => {
  const response = await api.get(`/marketing/${workspaceId}/email-campaigns`);
  return response.data.campaigns;
};

export const createEmailCampaign = async (
  workspaceId: string,
  data: CreateEmailCampaignData
): Promise<EmailCampaign> => {
  const response = await api.post(`/marketing/${workspaceId}/email-campaigns`, data);
  return response.data;
};

export const deleteEmailCampaign = async (workspaceId: string, campaignId: string): Promise<void> => {
  await api.delete(`/marketing/${workspaceId}/email-campaigns/${campaignId}`);
};

// ============ SOCIAL MEDIA POSTS ============

export interface SocialMediaPost {
  id: string;
  workspace_id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
  content: string;
  media_url?: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at?: string;
  published_at?: string;
  created_by: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSocialMediaPostData {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
}

export const getSocialMediaPosts = async (workspaceId: string): Promise<SocialMediaPost[]> => {
  const response = await api.get(`/marketing/${workspaceId}/social-media-posts`);
  return response.data.posts;
};

export const createSocialMediaPost = async (
  workspaceId: string,
  data: CreateSocialMediaPostData
): Promise<SocialMediaPost> => {
  const response = await api.post(`/marketing/${workspaceId}/social-media-posts`, data);
  return response.data;
};

export const deleteSocialMediaPost = async (workspaceId: string, postId: string): Promise<void> => {
  await api.delete(`/marketing/${workspaceId}/social-media-posts/${postId}`);
};

// ============ POSTER TEMPLATES ============

export interface PosterTemplate {
  id: string;
  workspace_id: string;
  name: string;
  template_type: 'poster' | 'banner' | 'social_media';
  design_data: any;
  preview_url?: string;
  created_by: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePosterTemplateData {
  name: string;
  templateType: 'poster' | 'banner' | 'social_media';
  designData: any;
}

export const getPosterTemplates = async (workspaceId: string): Promise<PosterTemplate[]> => {
  const response = await api.get(`/marketing/${workspaceId}/poster-templates`);
  return response.data.templates;
};

export const createPosterTemplate = async (
  workspaceId: string,
  data: CreatePosterTemplateData
): Promise<PosterTemplate> => {
  const response = await api.post(`/marketing/${workspaceId}/poster-templates`, data);
  return response.data;
};

export const deletePosterTemplate = async (workspaceId: string, templateId: string): Promise<void> => {
  await api.delete(`/marketing/${workspaceId}/poster-templates/${templateId}`);
};
