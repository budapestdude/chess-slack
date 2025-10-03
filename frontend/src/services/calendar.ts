/**
 * Calendar Service
 * Handles all API interactions for calendar events and availability
 */

const API_BASE = 'http://localhost:3001/api';

export interface Event {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  color: string;
  createdBy: string;
  attendees: EventAttendee[];
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  userId: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface CreateEventData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  color: string;
  attendeeIds: string[];
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface AvailabilityBlock {
  id: string;
  userId: string;
  status: 'available' | 'busy' | 'out-of-office';
  startTime: string;
  endTime: string;
}

/**
 * Fetch events for a workspace within a date range
 */
export const getEvents = async (
  workspaceId: string,
  start: string,
  end: string
): Promise<Event[]> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/events?start=${start}&end=${end}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token from localStorage/context
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

/**
 * Create a new event
 */
export const createEvent = async (
  workspaceId: string,
  data: CreateEventData
): Promise<Event> => {
  try {
    const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

/**
 * Update an existing event
 */
export const updateEvent = async (
  workspaceId: string,
  eventId: string,
  data: UpdateEventData
): Promise<Event> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

/**
 * Delete an event
 */
export const deleteEvent = async (
  workspaceId: string,
  eventId: string
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Update attendee status for an event
 */
export const updateAttendeeStatus = async (
  workspaceId: string,
  eventId: string,
  status: 'accepted' | 'declined' | 'tentative'
): Promise<Event> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/events/${eventId}/attendees/me`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update attendee status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating attendee status:', error);
    throw error;
  }
};

/**
 * Get user's availability blocks
 */
export const getAvailability = async (
  workspaceId: string,
  userId: string,
  start: string,
  end: string
): Promise<AvailabilityBlock[]> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/availability/${userId}?start=${start}&end=${end}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch availability: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching availability:', error);
    throw error;
  }
};

/**
 * Set user's availability block
 */
export const setAvailability = async (
  workspaceId: string,
  data: Omit<AvailabilityBlock, 'id' | 'userId'>
): Promise<AvailabilityBlock> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/availability`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to set availability: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error setting availability:', error);
    throw error;
  }
};
