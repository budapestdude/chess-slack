import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Specific routes must come before generic routes
// /me/avatar must be before /:userId/avatar to match correctly
router.get('/me/avatar', authenticateToken, asyncHandler(userController.getAvatar));

// Public routes (no auth required for image loading in img tags)
router.get('/:userId/avatar', asyncHandler(userController.getUserAvatar));

// All other user routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/:userId/profile', asyncHandler(userController.getUserProfile));

// Update my profile
router.put('/me/profile', asyncHandler(userController.updateMyProfile));

// Avatar upload (requires auth)
router.post('/me/avatar', upload.single('avatar'), asyncHandler(userController.uploadAvatar));

// Set custom status
router.put('/me/status', asyncHandler(userController.setCustomStatus));

// Set presence
router.put('/me/presence', asyncHandler(userController.setPresence));

// DND settings
router.get('/me/dnd', asyncHandler(userController.getDndSettings));
router.put('/me/dnd', asyncHandler(userController.setDndSettings));

export default router;