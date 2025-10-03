import { Router } from 'express';
import * as agentController from '../controllers/agentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Agent management
router.post('/:workspaceId/agents', authenticateToken, agentController.createAgent);
router.get('/:workspaceId/agents', authenticateToken, agentController.getWorkspaceAgents);
router.get('/:workspaceId/agents/:agentId', authenticateToken, agentController.getAgent);
router.put('/:workspaceId/agents/:agentId', authenticateToken, agentController.updateAgent);
router.delete('/:workspaceId/agents/:agentId', authenticateToken, agentController.deleteAgent);

// Agent control
router.post('/:workspaceId/agents/:agentId/start', authenticateToken, agentController.startAgent);
router.post('/:workspaceId/agents/:agentId/stop', authenticateToken, agentController.stopAgent);

// Agent monitoring
router.get('/:workspaceId/agents/:agentId/logs', authenticateToken, agentController.getAgentLogs);

export default router;
