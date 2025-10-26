import express from 'express';
import projectController from '../controllers/projectController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Project routes
router.post('/projects', projectController.createProject);
router.get('/workspaces/:workspaceId/projects', projectController.getProjectsByWorkspace);
router.get('/projects/:projectId', projectController.getProjectById);
router.put('/projects/:projectId', projectController.updateProject);
router.post('/projects/:projectId/archive', projectController.archiveProject);
router.delete('/projects/:projectId', projectController.deleteProject);

// Project member routes
router.post('/projects/:projectId/members', projectController.addMember);
router.delete('/projects/:projectId/members/:userId', projectController.removeMember);
router.put('/projects/:projectId/members/:userId/role', projectController.updateMemberRole);

// Section routes
router.post('/projects/:projectId/sections', projectController.createSection);
router.put('/sections/:sectionId', projectController.updateSection);
router.delete('/sections/:sectionId', projectController.deleteSection);
router.post('/projects/:projectId/sections/reorder', projectController.reorderSections);

export default router;
