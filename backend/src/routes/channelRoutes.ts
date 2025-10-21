import { Router } from 'express';
import * as channelController from '../controllers/channelController';
import * as archiveController from '../controllers/archiveController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Channels
 *   description: Channel management endpoints
 */

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels:
 *   post:
 *     summary: Create a new channel
 *     description: Creates a new channel in the workspace. The creator becomes an admin member of the channel.
 *     tags: [Channels]
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
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 pattern: '^[a-z0-9-_]+$'
 *                 description: Channel name (lowercase letters, numbers, hyphens, underscores only)
 *                 example: "project-alpha"
 *               description:
 *                 type: string
 *                 description: Channel description
 *                 example: "Discussion about Project Alpha"
 *               topic:
 *                 type: string
 *                 description: Channel topic
 *                 example: "Weekly sprint planning"
 *               isPrivate:
 *                 type: boolean
 *                 default: false
 *                 description: Whether the channel is private (requires invitation to join)
 *     responses:
 *       201:
 *         description: Channel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       400:
 *         description: Invalid input or channel name already exists
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
 *         description: Not a member of this workspace
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels', authenticateToken, channelController.createChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels:
 *   get:
 *     summary: Get all channels
 *     description: Returns all public channels and private channels the user is a member of. Excludes archived channels.
 *     tags: [Channels]
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
 *         description: List of channels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channels:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Channel'
 *                       - type: object
 *                         properties:
 *                           isMember:
 *                             type: boolean
 *                             description: Whether current user is a member
 *                           userRole:
 *                             type: string
 *                             enum: [admin, member]
 *                             nullable: true
 *                             description: User's role in this channel
 *                           isMuted:
 *                             type: boolean
 *                             description: Whether user has muted this channel
 *                           isStarred:
 *                             type: boolean
 *                             description: Whether user has starred this channel
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
router.get('/:workspaceId/channels', authenticateToken, channelController.getChannels);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/browse/all:
 *   get:
 *     summary: Browse all channels
 *     description: Returns all channels in the workspace with member counts for browsing/discovery.
 *     tags: [Channels]
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
 *         description: All channels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channels:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Channel'
 *                       - type: object
 *                         properties:
 *                           isMember:
 *                             type: boolean
 *                           userRole:
 *                             type: string
 *                             enum: [admin, member]
 *                             nullable: true
 *                           memberCount:
 *                             type: integer
 *                             description: Total number of members in this channel
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
router.get('/:workspaceId/channels/browse/all', authenticateToken, channelController.browseChannels);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}:
 *   get:
 *     summary: Get channel details
 *     description: Returns detailed information about a specific channel. For private channels, user must be a member.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Channel'
 *                 - type: object
 *                   properties:
 *                     userRole:
 *                       type: string
 *                       enum: [admin, member]
 *                       nullable: true
 *                       description: Current user's role in this channel
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a member of workspace or private channel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:workspaceId/channels/:channelId', authenticateToken, channelController.getChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}:
 *   put:
 *     summary: Update channel
 *     description: Updates channel details. Only channel admins can update the channel.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
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
 *                 maxLength: 100
 *                 pattern: '^[a-z0-9-_]+$'
 *                 description: New channel name
 *               description:
 *                 type: string
 *                 description: New channel description
 *               topic:
 *                 type: string
 *                 description: New channel topic
 *             example:
 *               name: "project-alpha-v2"
 *               description: "Updated project discussion"
 *               topic: "Sprint 5 planning"
 *     responses:
 *       200:
 *         description: Channel updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 *       400:
 *         description: Invalid input, no fields to update, or channel name already exists
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
 *         description: Insufficient permissions (must be channel admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:workspaceId/channels/:channelId', authenticateToken, channelController.updateChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}:
 *   delete:
 *     summary: Delete channel
 *     description: Permanently deletes a channel and all associated messages. Only channel admins can delete. Cannot delete #general channel.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel deleted successfully"
 *       400:
 *         description: Cannot delete #general channel
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
 *         description: Insufficient permissions (must be channel admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:workspaceId/channels/:channelId', authenticateToken, channelController.deleteChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/join:
 *   post:
 *     summary: Join a channel
 *     description: Join a public channel. Private channels cannot be joined without invitation.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Joined channel successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Joined channel successfully"
 *       400:
 *         description: Already a member of this channel
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
 *         description: Not a member of workspace or cannot join private channel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels/:channelId/join', authenticateToken, channelController.joinChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/leave:
 *   post:
 *     summary: Leave a channel
 *     description: Leave a channel. Cannot leave #general channel.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Left channel successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Left channel successfully"
 *       400:
 *         description: Cannot leave #general channel
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
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels/:channelId/leave', authenticateToken, channelController.leaveChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/mute:
 *   post:
 *     summary: Mute a channel
 *     description: Mute notifications for a channel. User must be a member of the channel.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel muted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel muted successfully"
 *                 muted:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a member of this channel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels/:channelId/mute', authenticateToken, channelController.muteChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/unmute:
 *   post:
 *     summary: Unmute a channel
 *     description: Unmute notifications for a channel. User must be a member of the channel.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel unmuted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Channel unmuted successfully"
 *                 muted:
 *                   type: boolean
 *                   example: false
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a member of this channel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels/:channelId/unmute', authenticateToken, channelController.unmuteChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/star:
 *   post:
 *     summary: Star a channel
 *     description: Add a channel to the user's starred channels list for quick access. User must be a member.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       201:
 *         description: Channel starred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 channelId:
 *                   type: string
 *                   format: uuid
 *                 starredAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Channel is already starred
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
 *         description: Not a member of this channel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels/:channelId/star', authenticateToken, channelController.starChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/star:
 *   delete:
 *     summary: Unstar a channel
 *     description: Remove a channel from the user's starred channels list.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       204:
 *         description: Channel unstarred successfully
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:workspaceId/channels/:channelId/star', authenticateToken, channelController.unstarChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/starred/list:
 *   get:
 *     summary: Get starred channels
 *     description: Returns all channels the user has starred in this workspace.
 *     tags: [Channels]
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
 *         description: Starred channels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 starredChannels:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - type: object
 *                         properties:
 *                           starId:
 *                             type: string
 *                             format: uuid
 *                             description: Star record ID
 *                           starredAt:
 *                             type: string
 *                             format: date-time
 *                             description: When the channel was starred
 *                       - $ref: '#/components/schemas/Channel'
 *                       - type: object
 *                         properties:
 *                           userRole:
 *                             type: string
 *                             enum: [admin, member]
 *                             nullable: true
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:workspaceId/channels/starred/list', authenticateToken, channelController.getStarredChannels);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/archive:
 *   post:
 *     summary: Archive a channel
 *     description: Archives a channel, making it read-only and hidden from main channel list. Only admins and owners can archive channels.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel archived successfully
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
 *                 isArchived:
 *                   type: boolean
 *                   example: true
 *                 archivedAt:
 *                   type: string
 *                   format: date-time
 *                 archivedBy:
 *                   type: string
 *                   format: uuid
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions (must be admin or owner)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels/:channelId/archive', authenticateToken, archiveController.archiveChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/unarchive:
 *   post:
 *     summary: Unarchive a channel
 *     description: Restores an archived channel to active status. Only admins and owners can unarchive channels.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel unarchived successfully
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
 *                 isArchived:
 *                   type: boolean
 *                   example: false
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions (must be admin or owner)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workspaceId/channels/:channelId/unarchive', authenticateToken, archiveController.unarchiveChannel);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/archived/list:
 *   get:
 *     summary: Get archived channels
 *     description: Returns all archived channels in the workspace with message counts and archive metadata.
 *     tags: [Channels]
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
 *         description: Archived channels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 archivedChannels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       isPrivate:
 *                         type: boolean
 *                       archivedAt:
 *                         type: string
 *                         format: date-time
 *                       archivedBy:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           username:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                       messageCount:
 *                         type: integer
 *                         description: Total number of messages in the channel
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
router.get('/:workspaceId/channels/archived/list', authenticateToken, archiveController.getArchivedChannels);

/**
 * @swagger
 * /api/workspaces/{workspaceId}/channels/{channelId}/export:
 *   get:
 *     summary: Export channel history
 *     description: Exports complete channel history including all messages and attachments. User must be a channel member or workspace admin.
 *     tags: [Channels]
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
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel history exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channel:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       isEdited:
 *                         type: boolean
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           username:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                       attachments:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             filename:
 *                               type: string
 *                             fileSize:
 *                               type: integer
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 exportedBy:
 *                   type: string
 *                   format: uuid
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied (must be channel member or workspace admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:workspaceId/channels/:channelId/export', authenticateToken, archiveController.exportChannelHistory);

export default router;
