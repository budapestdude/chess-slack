import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import agentService from '../services/agentService';
import {
  AgentType,
  AgentStatus,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '../types/agent';

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['boss', 'code-validator', 'ui-designer', 'general-purpose', 'database-specialist', 'test-engineer']),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  configuration: z.object({
    model: z.string().optional(),
    maxConcurrentTasks: z.number().int().positive().optional(),
    timeout: z.number().int().positive().optional(),
    retryAttempts: z.number().int().min(0).optional(),
    customInstructions: z.string().optional(),
  }).passthrough().optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['idle', 'busy', 'error', 'offline']).optional(),
  capabilities: z.array(z.string()).optional(),
  configuration: z.object({
    model: z.string().optional(),
    maxConcurrentTasks: z.number().int().positive().optional(),
    timeout: z.number().int().positive().optional(),
    retryAttempts: z.number().int().min(0).optional(),
    customInstructions: z.string().optional(),
  }).passthrough().optional(),
});

const getAgentsQuerySchema = z.object({
  status: z.enum(['idle', 'busy', 'error', 'offline']).optional(),
  type: z.enum(['boss', 'code-validator', 'ui-designer', 'general-purpose', 'database-specialist', 'test-engineer']).optional(),
});

const getLogsQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('100'),
});

// Helper function to check workspace membership
async function checkWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }
}

// Helper function to check workspace membership and agent existence
async function checkWorkspaceAndAgent(workspaceId: string, agentId: string, userId: string): Promise<void> {
  await checkWorkspaceMembership(workspaceId, userId);

  const agent = await agentService.getAgent(agentId);
  if (!agent) {
    throw new NotFoundError('Agent not found');
  }

  if (agent.workspaceId !== workspaceId) {
    throw new ForbiddenError('Agent does not belong to this workspace');
  }
}

/**
 * POST /api/workspaces/:workspaceId/agents
 * Create a new agent
 */
export const createAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate request body
  const data = createAgentSchema.parse(req.body);

  // Create agent request
  const createRequest: CreateAgentRequest = {
    workspaceId,
    name: data.name,
    type: data.type as AgentType,
    description: data.description,
    capabilities: data.capabilities,
    configuration: data.configuration,
  };

  // Create agent via service
  const agent = await agentService.createAgent(createRequest, userId);

  logger.info('Agent created via API', { agentId: agent.id, workspaceId, userId });

  res.status(201).json(agent);
});

/**
 * GET /api/workspaces/:workspaceId/agents/:agentId
 * Get agent details
 */
export const getAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, agentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and agent existence
  await checkWorkspaceAndAgent(workspaceId, agentId, userId);

  // Get agent details
  const agent = await agentService.getAgent(agentId);

  res.json(agent);
});

/**
 * GET /api/workspaces/:workspaceId/agents
 * Get all agents in workspace with optional filters
 */
export const getWorkspaceAgents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getAgentsQuerySchema.parse(req.query);

  // Get agents
  let agents = await agentService.getWorkspaceAgents(workspaceId);

  // Apply filters
  if (query.status) {
    agents = agents.filter(agent => agent.status === query.status);
  }

  if (query.type) {
    agents = agents.filter(agent => agent.type === query.type);
  }

  res.json({ agents });
});

/**
 * PUT /api/workspaces/:workspaceId/agents/:agentId
 * Update agent configuration
 */
export const updateAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, agentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and agent existence
  await checkWorkspaceAndAgent(workspaceId, agentId, userId);

  // Validate request body
  const updates = updateAgentSchema.parse(req.body);

  // Update agent
  const agent = await agentService.updateAgent(agentId, updates as UpdateAgentRequest);

  logger.info('Agent updated via API', { agentId, workspaceId, userId });

  res.json(agent);
});

/**
 * DELETE /api/workspaces/:workspaceId/agents/:agentId
 * Delete an agent
 */
export const deleteAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, agentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and agent existence
  await checkWorkspaceAndAgent(workspaceId, agentId, userId);

  // Delete agent (will also stop it if running)
  await agentService.deleteAgent(agentId);

  logger.info('Agent deleted via API', { agentId, workspaceId, userId });

  res.json({ message: 'Agent deleted successfully' });
});

/**
 * POST /api/workspaces/:workspaceId/agents/:agentId/start
 * Start an agent
 */
export const startAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, agentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and agent existence
  await checkWorkspaceAndAgent(workspaceId, agentId, userId);

  // Start agent
  await agentService.startAgent(agentId);

  logger.info('Agent started via API', { agentId, workspaceId, userId });

  res.json({ message: 'Agent started successfully' });
});

/**
 * POST /api/workspaces/:workspaceId/agents/:agentId/stop
 * Stop an agent
 */
export const stopAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, agentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and agent existence
  await checkWorkspaceAndAgent(workspaceId, agentId, userId);

  // Stop agent
  await agentService.stopAgent(agentId);

  logger.info('Agent stopped via API', { agentId, workspaceId, userId });

  res.json({ message: 'Agent stopped successfully' });
});

/**
 * GET /api/workspaces/:workspaceId/agents/:agentId/logs
 * Get agent execution logs
 */
export const getAgentLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, agentId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and agent existence
  await checkWorkspaceAndAgent(workspaceId, agentId, userId);

  // Validate query parameters
  const query = getLogsQuerySchema.parse(req.query);
  const limit = parseInt(query.limit as unknown as string, 10);

  // Get logs
  const logs = await agentService.getAgentLogs(agentId, limit);

  res.json({ logs });
});
