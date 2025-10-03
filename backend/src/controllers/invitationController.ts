import { Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import logger from '../utils/logger';

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin']).default('member'),
});

const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const createInvitation = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { email, role } = createInvitationSchema.parse(req.body);
  const userId = req.userId!;

  // Check if user is admin or owner of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
    throw new ForbiddenError('Insufficient permissions to invite users');
  }

  // Check if user with email already exists and is already a member
  const userCheck = await pool.query(
    `SELECT u.id FROM users u
     JOIN workspace_members wm ON u.id = wm.user_id
     WHERE u.email = $1 AND wm.workspace_id = $2`,
    [email, workspaceId]
  );

  if (userCheck.rows.length > 0) {
    throw new BadRequestError('User is already a member of this workspace');
  }

  // Check if there's already a pending invitation for this email
  const existingInvitation = await pool.query(
    `SELECT id FROM workspace_invitations
     WHERE workspace_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()`,
    [workspaceId, email]
  );

  if (existingInvitation.rows.length > 0) {
    throw new BadRequestError('An active invitation already exists for this email');
  }

  // Generate token and create invitation
  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const result = await pool.query(
    `INSERT INTO workspace_invitations (workspace_id, inviter_id, email, token, role, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, workspace_id, inviter_id, email, token, role, status, expires_at, created_at`,
    [workspaceId, userId, email, token, role, expiresAt]
  );

  const invitation = result.rows[0];

  logger.info('Workspace invitation created', {
    invitationId: invitation.id,
    workspaceId,
    email,
    inviterId: userId,
  });

  res.status(201).json({
    id: invitation.id,
    workspaceId: invitation.workspace_id,
    inviterId: invitation.inviter_id,
    email: invitation.email,
    token: invitation.token,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    createdAt: invitation.created_at,
  });
};

export const getInvitations = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check if user is admin or owner of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
    throw new ForbiddenError('Insufficient permissions to view invitations');
  }

  const result = await pool.query(
    `SELECT wi.id, wi.workspace_id, wi.inviter_id, wi.email, wi.role, wi.status,
            wi.expires_at, wi.created_at, wi.updated_at,
            u.username as inviter_username, u.display_name as inviter_display_name
     FROM workspace_invitations wi
     JOIN users u ON wi.inviter_id = u.id
     WHERE wi.workspace_id = $1 AND wi.status = 'pending'
     ORDER BY wi.created_at DESC`,
    [workspaceId]
  );

  const invitations = result.rows.map(row => ({
    id: row.id,
    workspaceId: row.workspace_id,
    inviterId: row.inviter_id,
    inviterUsername: row.inviter_username,
    inviterDisplayName: row.inviter_display_name,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({ invitations });
};

export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  const { token } = req.params;
  const userId = req.userId!;

  // Get invitation
  const invitationResult = await pool.query(
    `SELECT wi.id, wi.workspace_id, wi.email, wi.role, wi.status, wi.expires_at,
            u.email as user_email
     FROM workspace_invitations wi, users u
     WHERE wi.token = $1 AND u.id = $2`,
    [token, userId]
  );

  if (invitationResult.rows.length === 0) {
    throw new NotFoundError('Invitation not found');
  }

  const invitation = invitationResult.rows[0];

  // Check if invitation is valid
  if (invitation.status !== 'pending') {
    throw new BadRequestError('Invitation is no longer valid');
  }

  if (new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await pool.query(
      'UPDATE workspace_invitations SET status = $1 WHERE id = $2',
      ['expired', invitation.id]
    );
    throw new BadRequestError('Invitation has expired');
  }

  // Check if email matches
  if (invitation.email !== invitation.user_email) {
    throw new ForbiddenError('This invitation was sent to a different email address');
  }

  // Check if user is already a member
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [invitation.workspace_id, userId]
  );

  if (memberCheck.rows.length > 0) {
    throw new BadRequestError('You are already a member of this workspace');
  }

  // Add user to workspace
  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, $3)`,
    [invitation.workspace_id, userId, invitation.role]
  );

  // Update invitation status
  await pool.query(
    'UPDATE workspace_invitations SET status = $1, accepted_at = NOW() WHERE id = $2',
    ['accepted', invitation.id]
  );

  // Get workspace details
  const workspaceResult = await pool.query(
    'SELECT id, name, slug, description, logo_url FROM workspaces WHERE id = $1',
    [invitation.workspace_id]
  );

  const workspace = workspaceResult.rows[0];

  logger.info('Workspace invitation accepted', {
    invitationId: invitation.id,
    workspaceId: invitation.workspace_id,
    userId,
  });

  res.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logoUrl: workspace.logo_url,
      role: invitation.role,
    },
  });
};

export const revokeInvitation = async (req: AuthRequest, res: Response) => {
  const { workspaceId, invitationId } = req.params;
  const userId = req.userId!;

  // Check if user is admin or owner of workspace
  const memberCheck = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
    throw new ForbiddenError('Insufficient permissions to revoke invitations');
  }

  // Check if invitation exists and belongs to this workspace
  const invitationCheck = await pool.query(
    'SELECT id FROM workspace_invitations WHERE id = $1 AND workspace_id = $2',
    [invitationId, workspaceId]
  );

  if (invitationCheck.rows.length === 0) {
    throw new NotFoundError('Invitation not found');
  }

  // Update invitation status
  await pool.query(
    'UPDATE workspace_invitations SET status = $1 WHERE id = $2',
    ['revoked', invitationId]
  );

  logger.info('Workspace invitation revoked', {
    invitationId,
    workspaceId,
    revokedBy: userId,
  });

  res.json({ message: 'Invitation revoked successfully' });
};

export const getInvitationByToken = async (req: AuthRequest, res: Response) => {
  const { token } = req.params;

  const result = await pool.query(
    `SELECT wi.id, wi.workspace_id, wi.email, wi.role, wi.status, wi.expires_at,
            w.name as workspace_name, w.slug as workspace_slug, w.logo_url as workspace_logo,
            u.username as inviter_username, u.display_name as inviter_display_name
     FROM workspace_invitations wi
     JOIN workspaces w ON wi.workspace_id = w.id
     JOIN users u ON wi.inviter_id = u.id
     WHERE wi.token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Invitation not found');
  }

  const invitation = result.rows[0];

  // Check if expired
  if (new Date(invitation.expires_at) < new Date() && invitation.status === 'pending') {
    await pool.query(
      'UPDATE workspace_invitations SET status = $1 WHERE id = $2',
      ['expired', invitation.id]
    );
    invitation.status = 'expired';
  }

  res.json({
    id: invitation.id,
    workspaceId: invitation.workspace_id,
    workspaceName: invitation.workspace_name,
    workspaceSlug: invitation.workspace_slug,
    workspaceLogo: invitation.workspace_logo,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    inviterUsername: invitation.inviter_username,
    inviterDisplayName: invitation.inviter_display_name,
  });
};
