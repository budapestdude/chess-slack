import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Workspace management endpoints
 */

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a new workspace
 *     description: Creates a new workspace with the authenticated user as owner. Automatically creates default channels based on workspace type (general for standard, or general/announcements/pairings/results for tournament).
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Display name of the workspace
 *                 example: "My Chess Club"
 *               slug:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 pattern: '^[a-z0-9-]+$'
 *                 description: Unique URL-friendly identifier (lowercase letters, numbers, hyphens only)
 *                 example: "my-chess-club"
 *               description:
 *                 type: string
 *                 description: Optional workspace description
 *                 example: "A workspace for our local chess club"
 *               workspaceType:
 *                 type: string
 *                 enum: [standard, tournament]
 *                 default: standard
 *                 description: Type of workspace (standard or tournament)
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 logoUrl:
 *                   type: string
 *                   nullable: true
 *                 ownerId:
 *                   type: string
 *                   format: uuid
 *                 workspaceType:
 *                   type: string
 *                   enum: [standard, tournament]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input or slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticateToken, workspaceController.createWorkspace);

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     summary: Get all workspaces for current user
 *     description: Returns all workspaces where the authenticated user is a member, along with their role in each workspace.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       logoUrl:
 *                         type: string
 *                         nullable: true
 *                       ownerId:
 *                         type: string
 *                         format: uuid
 *                       workspaceType:
 *                         type: string
 *                         enum: [standard, tournament]
 *                       role:
 *                         type: string
 *                         enum: [owner, admin, member]
 *                         description: User's role in this workspace
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticateToken, workspaceController.getWorkspaces);

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   get:
 *     summary: Get workspace details
 *     description: Returns detailed information about a specific workspace. User must be a member of the workspace.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 logoUrl:
 *                   type: string
 *                   nullable: true
 *                 ownerId:
 *                   type: string
 *                   format: uuid
 *                 workspaceType:
 *                   type: string
 *                   enum: [standard, tournament]
 *                 role:
 *                   type: string
 *                   enum: [owner, admin, member]
 *                   description: Current user's role in this workspace
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a member of this workspace
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:workspaceId', authenticateToken, workspaceController.getWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   put:
 *     summary: Update workspace
 *     description: Updates workspace details. Only workspace owners and admins can update the workspace.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: New workspace name
 *               description:
 *                 type: string
 *                 description: New workspace description
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to workspace logo image
 *             example:
 *               name: "Updated Chess Club"
 *               description: "An updated description"
 *               logoUrl: "https://example.com/logo.png"
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 logoUrl:
 *                   type: string
 *                   nullable: true
 *                 ownerId:
 *                   type: string
 *                   format: uuid
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input or no fields to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions (must be owner or admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:workspaceId', authenticateToken, workspaceController.updateWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   delete:
 *     summary: Delete workspace
 *     description: Permanently deletes a workspace and all associated data (channels, messages, documents, etc.). Only the workspace owner can delete it.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Workspace deleted successfully"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Only the owner can delete the workspace
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:workspaceId', authenticateToken, workspaceController.deleteWorkspace);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/members:
 *   get:
 *     summary: Get workspace members
 *     description: Returns all members of a workspace with optional search filtering. User must be a member of the workspace to view members.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workspace ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional search query to filter members by username or display name
 *         example: "john"
 *     responses:
 *       200:
 *         description: Workspace members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       username:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum: [online, away, busy, offline]
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a member of this workspace
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:workspaceId/members', authenticateToken, workspaceController.getWorkspaceMembers);

export default router;