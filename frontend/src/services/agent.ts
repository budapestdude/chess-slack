import api from './api';
import {
  Agent,
  AgentTask,
  ProjectArtifact,
  CreateAgentRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../types/agent';

export const agentService = {
  // Agent Management
  async createAgent(workspaceId: string, data: CreateAgentRequest): Promise<Agent> {
    const response = await api.post(`/workspaces/${workspaceId}/agents`, data);
    return response.data.agent;
  },

  async getAgents(workspaceId: string): Promise<Agent[]> {
    const response = await api.get(`/workspaces/${workspaceId}/agents`);
    return response.data.agents;
  },

  async getAgent(workspaceId: string, agentId: string): Promise<Agent> {
    const response = await api.get(`/workspaces/${workspaceId}/agents/${agentId}`);
    return response.data.agent;
  },

  async updateAgent(workspaceId: string, agentId: string, data: Partial<Agent>): Promise<Agent> {
    const response = await api.put(`/workspaces/${workspaceId}/agents/${agentId}`, data);
    return response.data.agent;
  },

  async deleteAgent(workspaceId: string, agentId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/agents/${agentId}`);
  },

  async startAgent(workspaceId: string, agentId: string): Promise<Agent> {
    const response = await api.post(`/workspaces/${workspaceId}/agents/${agentId}/start`);
    return response.data.agent;
  },

  async stopAgent(workspaceId: string, agentId: string): Promise<Agent> {
    const response = await api.post(`/workspaces/${workspaceId}/agents/${agentId}/stop`);
    return response.data.agent;
  },

  async getAgentLogs(workspaceId: string, agentId: string, limit?: number): Promise<any[]> {
    const response = await api.get(`/workspaces/${workspaceId}/agents/${agentId}/logs`, {
      params: { limit },
    });
    return response.data.logs;
  },

  // Task Management
  async createTask(workspaceId: string, data: CreateTaskRequest): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks`, data);
    return response.data.task;
  },

  async getTasks(workspaceId: string, filters?: any): Promise<AgentTask[]> {
    const response = await api.get(`/workspaces/${workspaceId}/tasks`, { params: filters });
    return response.data.tasks;
  },

  async getTask(workspaceId: string, taskId: string): Promise<AgentTask> {
    const response = await api.get(`/workspaces/${workspaceId}/tasks/${taskId}`);
    return response.data.task;
  },

  async updateTask(workspaceId: string, taskId: string, data: UpdateTaskRequest): Promise<AgentTask> {
    const response = await api.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data);
    return response.data.task;
  },

  async deleteTask(workspaceId: string, taskId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
  },

  async assignTask(workspaceId: string, taskId: string, agentId: string): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/assign`, { agentId });
    return response.data.task;
  },

  async startTask(workspaceId: string, taskId: string): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/start`);
    return response.data.task;
  },

  async cancelTask(workspaceId: string, taskId: string): Promise<AgentTask> {
    const response = await api.post(`/workspaces/${workspaceId}/tasks/${taskId}/cancel`);
    return response.data.task;
  },

  // Artifact Management
  async getArtifacts(workspaceId: string, filters?: any): Promise<ProjectArtifact[]> {
    const response = await api.get(`/workspaces/${workspaceId}/artifacts`, { params: filters });
    return response.data.artifacts;
  },

  async getArtifact(workspaceId: string, artifactId: string): Promise<ProjectArtifact> {
    const response = await api.get(`/workspaces/${workspaceId}/artifacts/${artifactId}`);
    return response.data.artifact;
  },

  async updateArtifact(workspaceId: string, artifactId: string, data: Partial<ProjectArtifact>): Promise<ProjectArtifact> {
    const response = await api.put(`/workspaces/${workspaceId}/artifacts/${artifactId}`, data);
    return response.data.artifact;
  },

  async deleteArtifact(workspaceId: string, artifactId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/artifacts/${artifactId}`);
  },
};

export default agentService;
