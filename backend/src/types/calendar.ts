// Calendar Types
// Types for the Calendar and Event Management System

// ============================================
// CALENDAR EVENTS
// ============================================

export interface CalendarEvent {
  id: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  color: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule | null;
  parentEventId?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  color?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  attendees?: string[]; // User IDs to invite
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  allDay?: boolean;
  color?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
}

// ============================================
// RECURRENCE RULES
// ============================================

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  interval?: number; // Repeat every N days/weeks/months/years
  until?: Date; // End date for recurrence
  byweekday?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  count?: number; // Number of occurrences
}

// ============================================
// EVENT ATTENDEES
// ============================================

export type AttendeeStatus = 'accepted' | 'declined' | 'tentative' | 'no_response';

export interface EventAttendee {
  id: string;
  eventId: string;
  userId: string;
  status: AttendeeStatus;
  isOrganizer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddAttendeeRequest {
  userId: string;
  isOrganizer?: boolean;
}

export interface UpdateAttendeeStatusRequest {
  status: AttendeeStatus;
}

// ============================================
// EVENT REMINDERS
// ============================================

export interface EventReminder {
  id: string;
  eventId: string;
  userId: string;
  reminderMinutesBefore: number;
  sentAt?: Date | null;
  createdAt: Date;
}

export interface CreateReminderRequest {
  minutesBefore: number;
}

// ============================================
// USER AVAILABILITY
// ============================================

export type AvailabilityStatus = 'busy' | 'out_of_office' | 'working_elsewhere';

export interface UserAvailability {
  id: string;
  userId: string;
  workspaceId: string;
  startTime: Date;
  endTime: Date;
  status: AvailabilityStatus;
  title?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetAvailabilityRequest {
  startTime: Date;
  endTime: Date;
  status: AvailabilityStatus;
  title?: string;
}

// ============================================
// MEETING ROOMS
// ============================================

export interface MeetingRoom {
  id: string;
  workspaceId: string;
  name: string;
  capacity?: number | null;
  location?: string | null;
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomBooking {
  id: string;
  roomId: string;
  eventId: string;
  createdAt: Date;
}

// ============================================
// EVENT CONFLICTS
// ============================================

export interface EventConflict {
  eventId: string;
  eventTitle: string;
  eventStart: Date;
  eventEnd: Date;
}
