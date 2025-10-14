import api from './api';

// ============ TYPES ============

export interface Sprint {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  budget?: number;
  target_audience?: string;
  kpis?: Record<string, any>;
  created_by: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
  members?: SprintMember[];
}

export interface SprintTask {
  id: string;
  sprint_id: string;
  phase_id?: string;
  title: string;
  description?: string;
  task_type: 'content' | 'design' | 'social' | 'email' | 'sponsor' | 'analytics' | 'other';
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_to_username?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  dependencies?: string[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  email_campaign_id?: string;
  email_campaign_name?: string;
  social_post_id?: string;
  social_post_content?: string;
  poster_template_id?: string;
  poster_template_name?: string;
  sponsor_id?: string;
  sponsor_name?: string;
  created_by: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface SprintMember {
  id: string;
  name: string;
  role: 'lead' | 'member' | 'contributor';
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface SprintMetrics {
  id: string;
  sprint_id: string;
  metric_date: string;
  email_sends: number;
  email_opens: number;
  email_clicks: number;
  social_posts: number;
  social_engagements: number;
  website_visits: number;
  conversions: number;
  sponsor_contacts: number;
  additional_metrics?: Record<string, any>;
}

export interface SprintPhase {
  id: string;
  sprint_id: string;
  name: string;
  description?: string;
  phase_order: number;
  start_date?: string;
  end_date?: string;
  status: 'pending' | 'active' | 'completed';
  color: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
}

export interface CreateSprintData {
  name: string;
  description?: string;
  goal?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  targetAudience?: string;
  kpis?: Record<string, any>;
  memberIds?: string[];
}

export interface UpdateSprintData {
  name?: string;
  description?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: 'planning' | 'active' | 'completed' | 'cancelled';
  budget?: number;
  targetAudience?: string;
  kpis?: Record<string, any>;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  taskType: 'content' | 'design' | 'social' | 'email' | 'sponsor' | 'analytics' | 'other';
  status?: 'todo' | 'in_progress' | 'review' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  estimatedHours?: number;
  phaseId?: string;
  dependencies?: string[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  emailCampaignId?: string;
  socialPostId?: string;
  posterTemplateId?: string;
  sponsorId?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  actualHours?: number;
}

export interface UpdateMetricsData {
  metricDate: string;
  emailSends?: number;
  emailOpens?: number;
  emailClicks?: number;
  socialPosts?: number;
  socialEngagements?: number;
  websiteVisits?: number;
  conversions?: number;
  sponsorContacts?: number;
  additionalMetrics?: Record<string, any>;
}

export interface CreatePhaseData {
  name: string;
  description?: string;
  phaseOrder: number;
  startDate?: string;
  endDate?: string;
  color?: string;
}

export interface UpdatePhaseData {
  name?: string;
  description?: string;
  phaseOrder?: number;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'active' | 'completed';
  color?: string;
}

// ============ SPRINT API ============

export const getSprints = async (workspaceId: string, status?: string): Promise<Sprint[]> => {
  const params = status ? `?status=${status}` : '';
  const response = await api.get(`/sprints/${workspaceId}/sprints${params}`);
  return response.data.sprints;
};

export const getSprint = async (workspaceId: string, sprintId: string): Promise<Sprint> => {
  const response = await api.get(`/sprints/${workspaceId}/sprints/${sprintId}`);
  return response.data;
};

export const createSprint = async (workspaceId: string, data: CreateSprintData): Promise<Sprint> => {
  console.log('Creating sprint with workspaceId:', workspaceId, 'data:', data);
  const response = await api.post(`/sprints/${workspaceId}/sprints`, data);
  console.log('Sprint created:', response.data);
  return response.data;
};

export const updateSprint = async (
  workspaceId: string,
  sprintId: string,
  data: UpdateSprintData
): Promise<Sprint> => {
  const response = await api.put(`/sprints/${workspaceId}/sprints/${sprintId}`, data);
  return response.data;
};

export const deleteSprint = async (workspaceId: string, sprintId: string): Promise<void> => {
  await api.delete(`/sprints/${workspaceId}/sprints/${sprintId}`);
};

// ============ TASK API ============

export const getTasks = async (workspaceId: string, sprintId: string): Promise<SprintTask[]> => {
  const response = await api.get(`/sprints/${workspaceId}/sprints/${sprintId}/tasks`);
  return response.data.tasks;
};

export const getTask = async (
  workspaceId: string,
  sprintId: string,
  taskId: string
): Promise<SprintTask> => {
  const response = await api.get(`/sprints/${workspaceId}/sprints/${sprintId}/tasks/${taskId}`);
  return response.data;
};

export const createTask = async (
  workspaceId: string,
  sprintId: string,
  data: CreateTaskData
): Promise<SprintTask> => {
  const response = await api.post(`/sprints/${workspaceId}/sprints/${sprintId}/tasks`, data);
  return response.data;
};

export const updateTask = async (
  workspaceId: string,
  sprintId: string,
  taskId: string,
  data: UpdateTaskData
): Promise<SprintTask> => {
  const response = await api.put(`/sprints/${workspaceId}/sprints/${sprintId}/tasks/${taskId}`, data);
  return response.data;
};

export const deleteTask = async (
  workspaceId: string,
  sprintId: string,
  taskId: string
): Promise<void> => {
  await api.delete(`/sprints/${workspaceId}/sprints/${sprintId}/tasks/${taskId}`);
};

// ============ METRICS API ============

export const getMetrics = async (workspaceId: string, sprintId: string): Promise<SprintMetrics[]> => {
  const response = await api.get(`/sprints/${workspaceId}/sprints/${sprintId}/metrics`);
  return response.data.metrics;
};

export const updateMetrics = async (
  workspaceId: string,
  sprintId: string,
  data: UpdateMetricsData
): Promise<SprintMetrics> => {
  const response = await api.post(`/sprints/${workspaceId}/sprints/${sprintId}/metrics`, data);
  return response.data;
};

// ============ PHASE API ============

export const getPhases = async (workspaceId: string, sprintId: string): Promise<SprintPhase[]> => {
  const response = await api.get(`/sprints/${workspaceId}/sprints/${sprintId}/phases`);
  return response.data.phases;
};

export const createPhase = async (
  workspaceId: string,
  sprintId: string,
  data: CreatePhaseData
): Promise<SprintPhase> => {
  const response = await api.post(`/sprints/${workspaceId}/sprints/${sprintId}/phases`, data);
  return response.data;
};

export const updatePhase = async (
  workspaceId: string,
  sprintId: string,
  phaseId: string,
  data: UpdatePhaseData
): Promise<SprintPhase> => {
  const response = await api.put(`/sprints/${workspaceId}/sprints/${sprintId}/phases/${phaseId}`, data);
  return response.data;
};

export const deletePhase = async (
  workspaceId: string,
  sprintId: string,
  phaseId: string
): Promise<void> => {
  await api.delete(`/sprints/${workspaceId}/sprints/${sprintId}/phases/${phaseId}`);
};
