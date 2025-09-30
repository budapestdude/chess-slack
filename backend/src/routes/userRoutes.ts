import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/:userId/profile', userController.getUserProfile);

// Update my profile
router.put('/me/profile', userController.updateMyProfile);

// Set custom status
router.put('/me/status', userController.setCustomStatus);

// Set presence
router.put('/me/presence', userController.setPresence);

export default router;