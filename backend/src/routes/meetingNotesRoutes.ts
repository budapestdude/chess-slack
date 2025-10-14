import { Router } from 'express';
import * as meetingNotesController from '../controllers/meetingNotesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Meeting notes management
router.post('/:workspaceId/meeting-notes', authenticateToken, meetingNotesController.createMeetingNote);
router.get('/:workspaceId/meeting-notes', authenticateToken, meetingNotesController.getMeetingNotes);
router.get('/:workspaceId/meeting-notes/:noteId', authenticateToken, meetingNotesController.getMeetingNote);
router.put('/:workspaceId/meeting-notes/:noteId', authenticateToken, meetingNotesController.updateMeetingNote);
router.delete('/:workspaceId/meeting-notes/:noteId', authenticateToken, meetingNotesController.deleteMeetingNote);

export default router;
