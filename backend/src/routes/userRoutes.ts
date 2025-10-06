import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Specific routes must come before generic routes
// /me/avatar must be before /:userId/avatar to match correctly
router.get('/me/avatar', authenticateToken, userController.getAvatar);

// Public routes (no auth required for image loading in img tags)
router.get('/:userId/avatar', userController.getUserAvatar);

// All other user routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/:userId/profile', userController.getUserProfile);

// Update my profile
router.put('/me/profile', userController.updateMyProfile);

// Avatar upload (requires auth)
router.post('/me/avatar', upload.single('avatar'), userController.uploadAvatar);

// Set custom status
router.put('/me/status', userController.setCustomStatus);

// Set presence
router.put('/me/presence', userController.setPresence);

// DND settings
router.get('/me/dnd', userController.getDndSettings);
router.put('/me/dnd', userController.setDndSettings);

export default router;