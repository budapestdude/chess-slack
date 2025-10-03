import { Router } from 'express';
import * as calendarController from '../controllers/calendarController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Event management
router.post('/:workspaceId/calendar/events', authenticateToken, calendarController.createEvent);
router.get('/:workspaceId/calendar/events', authenticateToken, calendarController.getEvents);
router.get('/:workspaceId/calendar/events/:eventId', authenticateToken, calendarController.getEvent);
router.put('/:workspaceId/calendar/events/:eventId', authenticateToken, calendarController.updateEvent);
router.delete('/:workspaceId/calendar/events/:eventId', authenticateToken, calendarController.deleteEvent);

// Attendee management
router.post('/:workspaceId/calendar/events/:eventId/attendees', authenticateToken, calendarController.addAttendee);
router.put('/:workspaceId/calendar/events/:eventId/attendees/:userId', authenticateToken, calendarController.updateAttendeeStatus);
router.delete('/:workspaceId/calendar/events/:eventId/attendees/:userId', authenticateToken, calendarController.removeAttendee);

// User availability
router.get('/:workspaceId/calendar/availability', authenticateToken, calendarController.getUserAvailability);
router.post('/:workspaceId/calendar/availability', authenticateToken, calendarController.setUserAvailability);

export default router;
