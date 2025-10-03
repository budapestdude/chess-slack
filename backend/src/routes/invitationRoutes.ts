import { Router } from 'express';
import * as invitationController from '../controllers/invitationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Create invitation for a workspace
router.post('/:workspaceId/invitations', authenticateToken, invitationController.createInvitation);

// Get all pending invitations for a workspace
router.get('/:workspaceId/invitations', authenticateToken, invitationController.getInvitations);

// Revoke an invitation
router.delete('/:workspaceId/invitations/:invitationId', authenticateToken, invitationController.revokeInvitation);

// Get invitation details by token (for displaying invite page)
router.get('/invitations/token/:token', authenticateToken, invitationController.getInvitationByToken);

// Accept invitation
router.post('/invitations/token/:token/accept', authenticateToken, invitationController.acceptInvitation);

export default router;
