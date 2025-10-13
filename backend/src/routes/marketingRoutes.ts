import { Router } from 'express';
import * as marketingController from '../controllers/marketingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Sponsors routes
router.get('/:workspaceId/sponsors', authenticateToken, marketingController.getSponsors);
router.post('/:workspaceId/sponsors', authenticateToken, marketingController.createSponsor);
router.put('/:workspaceId/sponsors/:sponsorId', authenticateToken, marketingController.updateSponsor);
router.delete('/:workspaceId/sponsors/:sponsorId', authenticateToken, marketingController.deleteSponsor);

// Email campaigns routes
router.get('/:workspaceId/email-campaigns', authenticateToken, marketingController.getEmailCampaigns);
router.post('/:workspaceId/email-campaigns', authenticateToken, marketingController.createEmailCampaign);
router.delete('/:workspaceId/email-campaigns/:campaignId', authenticateToken, marketingController.deleteEmailCampaign);

// Social media posts routes
router.get('/:workspaceId/social-media-posts', authenticateToken, marketingController.getSocialMediaPosts);
router.post('/:workspaceId/social-media-posts', authenticateToken, marketingController.createSocialMediaPost);
router.delete('/:workspaceId/social-media-posts/:postId', authenticateToken, marketingController.deleteSocialMediaPost);

// Poster templates routes
router.get('/:workspaceId/poster-templates', authenticateToken, marketingController.getPosterTemplates);
router.post('/:workspaceId/poster-templates', authenticateToken, marketingController.createPosterTemplate);
router.delete('/:workspaceId/poster-templates/:templateId', authenticateToken, marketingController.deletePosterTemplate);

export default router;
