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

export default router;
