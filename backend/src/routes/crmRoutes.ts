import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  // Companies
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  // Contacts
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  // Deals
  createDeal,
  getDeals,
  getDeal,
  updateDeal,
  deleteDeal,
  // Activities
  createActivity,
  getActivities,
  updateActivity,
  deleteActivity,
  // Analytics
  getCRMStats,
} from '../controllers/crmController';
import leadController from '../controllers/leadController';
import opportunityController from '../controllers/opportunityController';
import emailController from '../controllers/emailController';
import campaignController from '../controllers/campaignController';

const router = express.Router();

// All routes require authentication and workspace membership
router.use('/:workspaceId/*', authenticateToken);

// Company routes
router.post('/:workspaceId/companies', createCompany);
router.get('/:workspaceId/companies', getCompanies);
router.get('/:workspaceId/companies/:companyId', getCompany);
router.put('/:workspaceId/companies/:companyId', updateCompany);
router.delete('/:workspaceId/companies/:companyId', deleteCompany);

// Contact routes
router.post('/:workspaceId/contacts', createContact);
router.get('/:workspaceId/contacts', getContacts);
router.get('/:workspaceId/contacts/:contactId', getContact);
router.put('/:workspaceId/contacts/:contactId', updateContact);
router.delete('/:workspaceId/contacts/:contactId', deleteContact);

// Deal routes
router.post('/:workspaceId/deals', createDeal);
router.get('/:workspaceId/deals', getDeals);
router.get('/:workspaceId/deals/:dealId', getDeal);
router.put('/:workspaceId/deals/:dealId', updateDeal);
router.delete('/:workspaceId/deals/:dealId', deleteDeal);

// Activity routes
router.post('/:workspaceId/activities', createActivity);
router.get('/:workspaceId/activities', getActivities);
router.put('/:workspaceId/activities/:activityId', updateActivity);
router.delete('/:workspaceId/activities/:activityId', deleteActivity);

// Analytics routes
router.get('/:workspaceId/stats', getCRMStats);

// ============================================
// LEAD ROUTES (Salesforce-style)
// ============================================

// Create a new lead
router.post('/:workspaceId/leads', leadController.createLead);

// Get all leads for a workspace (with optional filters)
router.get('/:workspaceId/leads', leadController.getLeads);

// Get a single lead by ID
router.get('/:workspaceId/leads/:id', leadController.getLead);

// Update a lead
router.put('/:workspaceId/leads/:id', leadController.updateLead);

// Delete a lead
router.delete('/:workspaceId/leads/:id', leadController.deleteLead);

// Convert a lead to contact/account/opportunity
router.post('/:workspaceId/leads/:id/convert', leadController.convertLead);

// Update lead score (recalculate)
router.post('/:workspaceId/leads/:id/score', leadController.updateLeadScore);

// Bulk import leads
router.post('/:workspaceId/leads/import', leadController.importLeads);

// ============================================
// OPPORTUNITY ROUTES (Salesforce-style)
// ============================================

// Create a new opportunity
router.post('/:workspaceId/opportunities', opportunityController.createOpportunity);

// Get all opportunities for a workspace (with optional filters)
router.get('/:workspaceId/opportunities', opportunityController.getOpportunities);

// Get a single opportunity by ID
router.get('/:workspaceId/opportunities/:id', opportunityController.getOpportunity);

// Update an opportunity
router.put('/:workspaceId/opportunities/:id', opportunityController.updateOpportunity);

// Delete an opportunity
router.delete('/:workspaceId/opportunities/:id', opportunityController.deleteOpportunity);

// Mark opportunity as won
router.post('/:workspaceId/opportunities/:id/won', opportunityController.markWon);

// Mark opportunity as lost
router.post('/:workspaceId/opportunities/:id/lost', opportunityController.markLost);

// Add product to opportunity
router.post('/:workspaceId/opportunities/:id/products', opportunityController.addProduct);

// Remove product from opportunity
router.delete('/:workspaceId/opportunities/:id/products/:product_id', opportunityController.removeProduct);

// Get forecast by category
router.get('/:workspaceId/forecast', opportunityController.getForecast);

// Get pipeline metrics by stage
router.get('/:workspaceId/pipeline', opportunityController.getPipelineMetrics);

// Get win/loss analysis
router.get('/:workspaceId/win-loss-analysis', opportunityController.getWinLossAnalysis);

// ============================================
// EMAIL ROUTES (Salesforce-style)
// ============================================

// Create a new email (draft or send)
router.post('/:workspaceId/emails', emailController.createEmail);

// Get all emails for a workspace (with optional filters)
router.get('/:workspaceId/emails', emailController.getEmails);

// Get a single email by ID
router.get('/:workspaceId/emails/:id', emailController.getEmail);

// Update an email (drafts only)
router.put('/:workspaceId/emails/:id', emailController.updateEmail);

// Send an email
router.post('/:workspaceId/emails/:id/send', emailController.sendEmail);

// Track email open (webhook endpoint)
router.post('/:workspaceId/emails/:id/track-open', emailController.trackEmailOpen);

// Mark email as delivered (webhook endpoint)
router.post('/:workspaceId/emails/:id/delivered', emailController.markDelivered);

// Mark email as bounced (webhook endpoint)
router.post('/:workspaceId/emails/:id/bounced', emailController.markBounced);

// Mark email as failed (webhook endpoint)
router.post('/:workspaceId/emails/:id/failed', emailController.markFailed);

// Delete an email
router.delete('/:workspaceId/emails/:id', emailController.deleteEmail);

// Get email statistics
router.get('/:workspaceId/emails/stats', emailController.getEmailStats);

// Get emails by relationship (lead, contact, or opportunity)
router.get('/:workspaceId/emails/relationship/:type/:id', emailController.getEmailsByRelationship);

// ============================================
// CAMPAIGN ROUTES (Salesforce-style)
// ============================================

// Create a new campaign
router.post('/:workspaceId/campaigns', campaignController.createCampaign);

// Get all campaigns for a workspace (with optional filters)
router.get('/:workspaceId/campaigns', campaignController.getCampaigns);

// Get campaigns performance summary
router.get('/:workspaceId/campaigns/performance', campaignController.getCampaignsPerformance);

// Get a single campaign by ID
router.get('/:workspaceId/campaigns/:id', campaignController.getCampaign);

// Update a campaign
router.put('/:workspaceId/campaigns/:id', campaignController.updateCampaign);

// Delete a campaign
router.delete('/:workspaceId/campaigns/:id', campaignController.deleteCampaign);

// Add member to campaign
router.post('/:workspaceId/campaigns/:id/members', campaignController.addMember);

// Bulk add members to campaign
router.post('/:workspaceId/campaigns/:id/members/bulk', campaignController.addMembers);

// Remove member from campaign
router.delete('/:workspaceId/campaigns/:id/members/:member_id', campaignController.removeMember);

// Mark campaign member as responded
router.post('/:workspaceId/campaigns/:id/members/:member_id/responded', campaignController.markMemberResponded);

// Get campaign members
router.get('/:workspaceId/campaigns/:id/members', campaignController.getCampaignMembers);

// Get campaign metrics (ROI, response rate, etc.)
router.get('/:workspaceId/campaigns/:id/metrics', campaignController.getCampaignMetrics);

export default router;
