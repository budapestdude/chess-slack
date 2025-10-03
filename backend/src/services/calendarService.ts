import pool from '../database/db';
import logger from '../utils/logger';
import {
  CalendarEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventAttendee,
  AttendeeStatus,
  EventReminder,
  UserAvailability,
  SetAvailabilityRequest,
  EventConflict,
} from '../types/calendar';

/**
 * Service for managing calendar events, attendees, and availability.
 * Handles CRUD operations for events, attendee management, and scheduling.
 */
class CalendarService {
  // ============================================
  // EVENT OPERATIONS
  // ============================================

  /**
   * Create a new calendar event
   */
  async createEvent(
    workspaceId: string,
    data: CreateEventRequest,
    createdBy: string
  ): Promise<CalendarEvent> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the event
      const result = await client.query(
        `INSERT INTO calendar_events (
          workspace_id, title, description, location, start_time, end_time,
          all_day, color, is_recurring, recurrence_rule, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          workspaceId,
          data.title,
          data.description || null,
          data.location || null,
          data.startTime,
          data.endTime,
          data.allDay || false,
          data.color || 'blue',
          data.isRecurring || false,
          data.recurrenceRule ? JSON.stringify(data.recurrenceRule) : null,
          createdBy,
        ]
      );

      const event = this.mapRowToEvent(result.rows[0]);

      // Add creator as organizer by default
      await client.query(
        `INSERT INTO event_attendees (event_id, user_id, status, is_organizer)
         VALUES ($1, $2, $3, $4)`,
        [event.id, createdBy, 'accepted', true]
      );

      // Add additional attendees if provided
      if (data.attendees && data.attendees.length > 0) {
        for (const userId of data.attendees) {
          if (userId !== createdBy) {
            await client.query(
              `INSERT INTO event_attendees (event_id, user_id, status, is_organizer)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (event_id, user_id) DO NOTHING`,
              [event.id, userId, 'no_response', false]
            );
          }
        }
      }

      await client.query('COMMIT');

      logger.info('Calendar event created', { eventId: event.id, workspaceId, title: event.title });

      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating calendar event', { error, workspaceId, data });
      throw new Error(`Failed to create calendar event: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM calendar_events WHERE id = $1',
        [eventId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEvent(result.rows[0]);
    } catch (error) {
      logger.error('Error getting calendar event', { error, eventId });
      throw new Error(`Failed to get calendar event: ${error}`);
    }
  }

  /**
   * Get all events for a workspace within a date range
   */
  async getWorkspaceEvents(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CalendarEvent[]> {
    try {
      let query = 'SELECT * FROM calendar_events WHERE workspace_id = $1';
      const params: any[] = [workspaceId];

      if (startDate && endDate) {
        query += ` AND (
          (start_time >= $2 AND start_time < $3)
          OR (end_time > $2 AND end_time <= $3)
          OR (start_time <= $2 AND end_time >= $3)
        )`;
        params.push(startDate, endDate);
      }

      query += ' ORDER BY start_time ASC';

      const result = await pool.query(query, params);
      return result.rows.map(row => this.mapRowToEvent(row));
    } catch (error) {
      logger.error('Error getting workspace events', { error, workspaceId, startDate, endDate });
      throw new Error(`Failed to get workspace events: ${error}`);
    }
  }

  /**
   * Get events for a specific user within a date range
   */
  async getUserEvents(
    userId: string,
    workspaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CalendarEvent[]> {
    try {
      if (startDate && endDate) {
        // Use the database helper function
        const result = await pool.query(
          'SELECT * FROM get_user_calendar_events($1, $2, $3, $4)',
          [userId, workspaceId, startDate, endDate]
        );

        return result.rows.map(row => ({
          id: row.event_id,
          workspaceId,
          title: row.title,
          description: row.description,
          location: row.location,
          startTime: new Date(row.start_time),
          endTime: new Date(row.end_time),
          allDay: row.all_day,
          color: row.color,
          isRecurring: false,
          recurrenceRule: null,
          parentEventId: null,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      } else {
        // Get all user events without date filter
        const result = await pool.query(
          `SELECT ce.* FROM calendar_events ce
           INNER JOIN event_attendees ea ON ce.id = ea.event_id
           WHERE ce.workspace_id = $1 AND ea.user_id = $2
           ORDER BY ce.start_time ASC`,
          [workspaceId, userId]
        );

        return result.rows.map(row => this.mapRowToEvent(row));
      }
    } catch (error) {
      logger.error('Error getting user events', { error, userId, workspaceId, startDate, endDate });
      throw new Error(`Failed to get user events: ${error}`);
    }
  }

  /**
   * Update an event
   */
  async updateEvent(eventId: string, updates: UpdateEventRequest): Promise<CalendarEvent> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.location !== undefined) {
        fields.push(`location = $${paramIndex++}`);
        values.push(updates.location);
      }
      if (updates.startTime !== undefined) {
        fields.push(`start_time = $${paramIndex++}`);
        values.push(updates.startTime);
      }
      if (updates.endTime !== undefined) {
        fields.push(`end_time = $${paramIndex++}`);
        values.push(updates.endTime);
      }
      if (updates.allDay !== undefined) {
        fields.push(`all_day = $${paramIndex++}`);
        values.push(updates.allDay);
      }
      if (updates.color !== undefined) {
        fields.push(`color = $${paramIndex++}`);
        values.push(updates.color);
      }
      if (updates.isRecurring !== undefined) {
        fields.push(`is_recurring = $${paramIndex++}`);
        values.push(updates.isRecurring);
      }
      if (updates.recurrenceRule !== undefined) {
        fields.push(`recurrence_rule = $${paramIndex++}`);
        values.push(JSON.stringify(updates.recurrenceRule));
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(eventId);
      const query = `
        UPDATE calendar_events
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      await client.query('COMMIT');

      const event = this.mapRowToEvent(result.rows[0]);
      logger.info('Calendar event updated', { eventId, updates });

      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating calendar event', { error, eventId, updates });
      throw new Error(`Failed to update calendar event: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM calendar_events WHERE id = $1 RETURNING id',
        [eventId]
      );

      if (result.rows.length === 0) {
        throw new Error('Event not found');
      }

      await client.query('COMMIT');
      logger.info('Calendar event deleted', { eventId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting calendar event', { error, eventId });
      throw new Error(`Failed to delete calendar event: ${error}`);
    } finally {
      client.release();
    }
  }

  // ============================================
  // ATTENDEE OPERATIONS
  // ============================================

  /**
   * Add an attendee to an event
   */
  async addAttendee(
    eventId: string,
    userId: string,
    isOrganizer: boolean = false
  ): Promise<EventAttendee> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify event exists
      const eventCheck = await client.query(
        'SELECT id FROM calendar_events WHERE id = $1',
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        throw new Error('Event not found');
      }

      // Add attendee
      const result = await client.query(
        `INSERT INTO event_attendees (event_id, user_id, status, is_organizer)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [eventId, userId, 'no_response', isOrganizer]
      );

      await client.query('COMMIT');

      const attendee = this.mapRowToAttendee(result.rows[0]);
      logger.info('Attendee added to event', { eventId, userId, isOrganizer });

      return attendee;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding attendee', { error, eventId, userId });
      throw new Error(`Failed to add attendee: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update attendee status
   */
  async updateAttendeeStatus(
    eventId: string,
    userId: string,
    status: AttendeeStatus
  ): Promise<EventAttendee> {
    try {
      const result = await pool.query(
        `UPDATE event_attendees
         SET status = $1
         WHERE event_id = $2 AND user_id = $3
         RETURNING *`,
        [status, eventId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Attendee not found');
      }

      const attendee = this.mapRowToAttendee(result.rows[0]);
      logger.info('Attendee status updated', { eventId, userId, status });

      return attendee;
    } catch (error) {
      logger.error('Error updating attendee status', { error, eventId, userId, status });
      throw new Error(`Failed to update attendee status: ${error}`);
    }
  }

  /**
   * Remove an attendee from an event
   */
  async removeAttendee(eventId: string, userId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2 RETURNING id',
        [eventId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Attendee not found');
      }

      logger.info('Attendee removed from event', { eventId, userId });
    } catch (error) {
      logger.error('Error removing attendee', { error, eventId, userId });
      throw new Error(`Failed to remove attendee: ${error}`);
    }
  }

  /**
   * Get all attendees for an event
   */
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM event_attendees WHERE event_id = $1 ORDER BY is_organizer DESC, created_at ASC',
        [eventId]
      );

      return result.rows.map(row => this.mapRowToAttendee(row));
    } catch (error) {
      logger.error('Error getting event attendees', { error, eventId });
      throw new Error(`Failed to get event attendees: ${error}`);
    }
  }

  // ============================================
  // REMINDER OPERATIONS
  // ============================================

  /**
   * Add a reminder for an event
   */
  async addReminder(
    eventId: string,
    userId: string,
    minutesBefore: number
  ): Promise<EventReminder> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify event exists and user is an attendee
      const attendeeCheck = await client.query(
        'SELECT id FROM event_attendees WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (attendeeCheck.rows.length === 0) {
        throw new Error('User is not an attendee of this event');
      }

      // Add reminder
      const result = await client.query(
        `INSERT INTO event_reminders (event_id, user_id, reminder_minutes_before)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [eventId, userId, minutesBefore]
      );

      await client.query('COMMIT');

      const reminder = this.mapRowToReminder(result.rows[0]);
      logger.info('Reminder added', { eventId, userId, minutesBefore });

      return reminder;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding reminder', { error, eventId, userId, minutesBefore });
      throw new Error(`Failed to add reminder: ${error}`);
    } finally {
      client.release();
    }
  }

  // ============================================
  // AVAILABILITY OPERATIONS
  // ============================================

  /**
   * Get user availability for a date range
   */
  async getUserAvailability(
    userId: string,
    workspaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserAvailability[]> {
    try {
      let query = 'SELECT * FROM user_availability WHERE user_id = $1 AND workspace_id = $2';
      const params: any[] = [userId, workspaceId];

      if (startDate && endDate) {
        query += ` AND (
          (start_time >= $3 AND start_time < $4)
          OR (end_time > $3 AND end_time <= $4)
          OR (start_time <= $3 AND end_time >= $4)
        )`;
        params.push(startDate, endDate);
      }

      query += ' ORDER BY start_time ASC';

      const result = await pool.query(query, params);
      return result.rows.map(row => this.mapRowToAvailability(row));
    } catch (error) {
      logger.error('Error getting user availability', { error, userId, workspaceId, startDate, endDate });
      throw new Error(`Failed to get user availability: ${error}`);
    }
  }

  /**
   * Set user availability
   */
  async setUserAvailability(
    userId: string,
    workspaceId: string,
    data: SetAvailabilityRequest
  ): Promise<UserAvailability> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO user_availability (user_id, workspace_id, start_time, end_time, status, title)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, workspaceId, data.startTime, data.endTime, data.status, data.title || null]
      );

      await client.query('COMMIT');

      const availability = this.mapRowToAvailability(result.rows[0]);
      logger.info('User availability set', { userId, workspaceId, data });

      return availability;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error setting user availability', { error, userId, workspaceId, data });
      throw new Error(`Failed to set user availability: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Check for event conflicts for a user
   */
  async checkEventConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string
  ): Promise<EventConflict[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM check_event_conflicts($1, $2, $3, $4)',
        [userId, startTime, endTime, excludeEventId || null]
      );

      return result.rows.map(row => ({
        eventId: row.event_id,
        eventTitle: row.event_title,
        eventStart: new Date(row.event_start),
        eventEnd: new Date(row.event_end),
      }));
    } catch (error) {
      logger.error('Error checking event conflicts', { error, userId, startTime, endTime });
      throw new Error(`Failed to check event conflicts: ${error}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map database row to CalendarEvent
   */
  private mapRowToEvent(row: any): CalendarEvent {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      description: row.description,
      location: row.location,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      allDay: row.all_day,
      color: row.color,
      isRecurring: row.is_recurring,
      recurrenceRule: row.recurrence_rule,
      parentEventId: row.parent_event_id,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to EventAttendee
   */
  private mapRowToAttendee(row: any): EventAttendee {
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      status: row.status as AttendeeStatus,
      isOrganizer: row.is_organizer,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to EventReminder
   */
  private mapRowToReminder(row: any): EventReminder {
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      reminderMinutesBefore: row.reminder_minutes_before,
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map database row to UserAvailability
   */
  private mapRowToAvailability(row: any): UserAvailability {
    return {
      id: row.id,
      userId: row.user_id,
      workspaceId: row.workspace_id,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      status: row.status,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new CalendarService();
