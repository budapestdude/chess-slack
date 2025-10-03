import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import calendarService from '../services/calendarService';
import {
  CreateEventRequest,
  UpdateEventRequest,
  AttendeeStatus,
  SetAvailabilityRequest,
} from '../types/calendar';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  location: z.string().max(255).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  color: z.string().max(50).optional().default('blue'),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.object({
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().int().positive().optional(),
    until: z.string().datetime().optional(),
    byweekday: z.array(z.number().int().min(0).max(6)).optional(),
    count: z.number().int().positive().optional(),
  }).optional(),
  attendees: z.array(z.string().uuid()).optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  location: z.string().max(255).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  color: z.string().max(50).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.object({
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().int().positive().optional(),
    until: z.string().datetime().optional(),
    byweekday: z.array(z.number().int().min(0).max(6)).optional(),
    count: z.number().int().positive().optional(),
  }).optional(),
});

const getEventsQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

const addAttendeeSchema = z.object({
  userId: z.string().uuid(),
  isOrganizer: z.boolean().optional().default(false),
});

const updateAttendeeStatusSchema = z.object({
  status: z.enum(['accepted', 'declined', 'tentative', 'no_response']),
});

const addReminderSchema = z.object({
  minutesBefore: z.number().int().positive(),
});

const setAvailabilitySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['busy', 'out_of_office', 'working_elsewhere']),
  title: z.string().max(255).optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function checkWorkspaceMembership(workspaceId: string, userId: string): Promise<void> {
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }
}

async function checkWorkspaceAndEvent(workspaceId: string, eventId: string, userId: string): Promise<void> {
  await checkWorkspaceMembership(workspaceId, userId);

  const event = await calendarService.getEvent(eventId);
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.workspaceId !== workspaceId) {
    throw new ForbiddenError('Event does not belong to this workspace');
  }
}

// ============================================
// EVENT CONTROLLERS
// ============================================

/**
 * POST /api/workspaces/:workspaceId/calendar/events
 * Create a new calendar event
 */
export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate request body
  const data = createEventSchema.parse(req.body);

  // Validate date range
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (endTime <= startTime) {
    throw new BadRequestError('End time must be after start time');
  }

  // Process recurrence rule if provided
  let recurrenceRule = undefined;
  if (data.recurrenceRule) {
    recurrenceRule = {
      ...data.recurrenceRule,
      until: data.recurrenceRule.until ? new Date(data.recurrenceRule.until) : undefined,
    };
  }

  // Create event request
  const createRequest: CreateEventRequest = {
    title: data.title,
    description: data.description,
    location: data.location,
    startTime,
    endTime,
    allDay: data.allDay,
    color: data.color,
    isRecurring: data.isRecurring,
    recurrenceRule,
    attendees: data.attendees,
  };

  // Create event
  const event = await calendarService.createEvent(workspaceId, createRequest, userId);

  logger.info('Calendar event created via API', { eventId: event.id, workspaceId, userId });

  res.status(201).json(event);
});

/**
 * GET /api/workspaces/:workspaceId/calendar/events/:eventId
 * Get event details with attendees
 */
export const getEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, eventId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and event existence
  await checkWorkspaceAndEvent(workspaceId, eventId, userId);

  // Get event details
  const event = await calendarService.getEvent(eventId);

  // Get attendees
  const attendees = await calendarService.getEventAttendees(eventId);

  res.json({ ...event, attendees });
});

/**
 * GET /api/workspaces/:workspaceId/calendar/events
 * Get calendar events with optional date range
 */
export const getEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate query parameters
  const query = getEventsQuerySchema.parse(req.query);

  const startDate = query.start ? new Date(query.start) : undefined;
  const endDate = query.end ? new Date(query.end) : undefined;

  // Get user's events for this workspace
  const events = await calendarService.getUserEvents(userId, workspaceId, startDate, endDate);

  res.json({ events });
});

/**
 * PUT /api/workspaces/:workspaceId/calendar/events/:eventId
 * Update a calendar event
 */
export const updateEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, eventId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and event existence
  await checkWorkspaceAndEvent(workspaceId, eventId, userId);

  // Check if user is the creator or organizer
  const event = await calendarService.getEvent(eventId);
  const attendees = await calendarService.getEventAttendees(eventId);
  const isOrganizer = attendees.some(a => a.userId === userId && a.isOrganizer);

  if (event!.createdBy !== userId && !isOrganizer) {
    throw new ForbiddenError('Only event creator or organizer can update the event');
  }

  // Validate request body
  const updates = updateEventSchema.parse(req.body);

  // Validate date range if both are provided
  if (updates.startTime && updates.endTime) {
    const startTime = new Date(updates.startTime);
    const endTime = new Date(updates.endTime);

    if (endTime <= startTime) {
      throw new BadRequestError('End time must be after start time');
    }
  }

  // Process recurrence rule if provided
  let recurrenceRule = undefined;
  if (updates.recurrenceRule) {
    recurrenceRule = {
      ...updates.recurrenceRule,
      until: updates.recurrenceRule.until ? new Date(updates.recurrenceRule.until) : undefined,
    };
  }

  // Update event request
  const updateRequest: UpdateEventRequest = {
    title: updates.title,
    description: updates.description,
    location: updates.location,
    startTime: updates.startTime ? new Date(updates.startTime) : undefined,
    endTime: updates.endTime ? new Date(updates.endTime) : undefined,
    allDay: updates.allDay,
    color: updates.color,
    isRecurring: updates.isRecurring,
    recurrenceRule,
  };

  // Update event
  const updatedEvent = await calendarService.updateEvent(eventId, updateRequest);

  logger.info('Calendar event updated via API', { eventId, workspaceId, userId });

  res.json(updatedEvent);
});

/**
 * DELETE /api/workspaces/:workspaceId/calendar/events/:eventId
 * Delete a calendar event
 */
export const deleteEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, eventId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and event existence
  await checkWorkspaceAndEvent(workspaceId, eventId, userId);

  // Check if user is the creator or organizer
  const event = await calendarService.getEvent(eventId);
  const attendees = await calendarService.getEventAttendees(eventId);
  const isOrganizer = attendees.some(a => a.userId === userId && a.isOrganizer);

  if (event!.createdBy !== userId && !isOrganizer) {
    throw new ForbiddenError('Only event creator or organizer can delete the event');
  }

  // Delete event
  await calendarService.deleteEvent(eventId);

  logger.info('Calendar event deleted via API', { eventId, workspaceId, userId });

  res.json({ message: 'Event deleted successfully' });
});

// ============================================
// ATTENDEE CONTROLLERS
// ============================================

/**
 * POST /api/workspaces/:workspaceId/calendar/events/:eventId/attendees
 * Add an attendee to an event
 */
export const addAttendee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, eventId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and event existence
  await checkWorkspaceAndEvent(workspaceId, eventId, userId);

  // Check if user is the creator or organizer
  const event = await calendarService.getEvent(eventId);
  const attendees = await calendarService.getEventAttendees(eventId);
  const isOrganizer = attendees.some(a => a.userId === userId && a.isOrganizer);

  if (event!.createdBy !== userId && !isOrganizer) {
    throw new ForbiddenError('Only event creator or organizer can add attendees');
  }

  // Validate request body
  const { userId: attendeeUserId, isOrganizer: makeOrganizer } = addAttendeeSchema.parse(req.body);

  // Verify the user to be added is a workspace member
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, attendeeUserId]
  );

  if (memberCheck.rows.length === 0) {
    throw new BadRequestError('User is not a member of this workspace');
  }

  // Add attendee
  const attendee = await calendarService.addAttendee(eventId, attendeeUserId, makeOrganizer);

  logger.info('Attendee added to event via API', { eventId, attendeeUserId, workspaceId, userId });

  res.status(201).json(attendee);
});

/**
 * PUT /api/workspaces/:workspaceId/calendar/events/:eventId/attendees/:userId
 * Update attendee status (RSVP)
 */
export const updateAttendeeStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, eventId, userId: attendeeUserId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and event existence
  await checkWorkspaceAndEvent(workspaceId, eventId, userId);

  // Users can only update their own status
  if (attendeeUserId !== userId) {
    throw new ForbiddenError('You can only update your own RSVP status');
  }

  // Validate request body
  const { status } = updateAttendeeStatusSchema.parse(req.body);

  // Update attendee status
  const attendee = await calendarService.updateAttendeeStatus(eventId, userId, status as AttendeeStatus);

  logger.info('Attendee status updated via API', { eventId, userId, status, workspaceId });

  res.json(attendee);
});

/**
 * DELETE /api/workspaces/:workspaceId/calendar/events/:eventId/attendees/:userId
 * Remove an attendee from an event
 */
export const removeAttendee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, eventId, userId: attendeeUserId } = req.params;
  const userId = req.userId!;

  // Check workspace membership and event existence
  await checkWorkspaceAndEvent(workspaceId, eventId, userId);

  // Check permissions: user can remove themselves, or organizer can remove others
  const event = await calendarService.getEvent(eventId);
  const attendees = await calendarService.getEventAttendees(eventId);
  const isOrganizer = attendees.some(a => a.userId === userId && a.isOrganizer);

  if (attendeeUserId !== userId && event!.createdBy !== userId && !isOrganizer) {
    throw new ForbiddenError('Only event creator, organizer, or the attendee themselves can remove attendees');
  }

  // Remove attendee
  await calendarService.removeAttendee(eventId, attendeeUserId);

  logger.info('Attendee removed from event via API', { eventId, attendeeUserId, workspaceId, userId });

  res.json({ message: 'Attendee removed successfully' });
});

// ============================================
// AVAILABILITY CONTROLLERS
// ============================================

/**
 * GET /api/workspaces/:workspaceId/calendar/availability
 * Get user availability
 */
export const getUserAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Parse query parameters
  const query = getEventsQuerySchema.parse(req.query);

  const startDate = query.start ? new Date(query.start) : undefined;
  const endDate = query.end ? new Date(query.end) : undefined;

  // Get user availability
  const availability = await calendarService.getUserAvailability(userId, workspaceId, startDate, endDate);

  res.json({ availability });
});

/**
 * POST /api/workspaces/:workspaceId/calendar/availability
 * Set user availability
 */
export const setUserAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  // Check workspace membership
  await checkWorkspaceMembership(workspaceId, userId);

  // Validate request body
  const data = setAvailabilitySchema.parse(req.body);

  // Validate date range
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (endTime <= startTime) {
    throw new BadRequestError('End time must be after start time');
  }

  // Set availability
  const availabilityRequest: SetAvailabilityRequest = {
    startTime,
    endTime,
    status: data.status,
    title: data.title,
  };

  const availability = await calendarService.setUserAvailability(userId, workspaceId, availabilityRequest);

  logger.info('User availability set via API', { userId, workspaceId });

  res.status(201).json(availability);
});
