-- Migration 009: Calendar and Event Management System
-- This migration adds calendar functionality for team scheduling and meetings

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    color VARCHAR(50) DEFAULT 'blue', -- blue, green, red, purple, orange, yellow, etc.

    -- Recurring events support
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule JSONB, -- RRULE format: {freq: 'DAILY', interval: 1, until: '2025-12-31', ...}
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE, -- For recurring event instances

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (end_time > start_time)
);

-- ============================================
-- EVENT ATTENDEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'no_response', -- 'accepted', 'declined', 'tentative', 'no_response'
    is_organizer BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique attendee per event
    UNIQUE(event_id, user_id)
);

-- ============================================
-- EVENT REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_minutes_before INT NOT NULL DEFAULT 15, -- 15, 30, 60, 1440 (1 day), etc.
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique reminder per event per user per time
    UNIQUE(event_id, user_id, reminder_minutes_before)
);

-- ============================================
-- USER AVAILABILITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'busy', -- 'busy', 'out_of_office', 'working_elsewhere'
    title VARCHAR(255), -- Optional title for the availability block
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (end_time > start_time)
);

-- ============================================
-- MEETING ROOMS TABLE (Optional - for future use)
-- ============================================
CREATE TABLE IF NOT EXISTS meeting_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    capacity INT,
    location VARCHAR(255),
    amenities JSONB DEFAULT '[]', -- ['projector', 'whiteboard', 'video_conference', ...]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(workspace_id, name)
);

-- ============================================
-- MEETING ROOM BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meeting_room_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(room_id, event_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_parent_id ON calendar_events(parent_event_id);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user_id ON event_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_sent_at ON event_reminders(sent_at);

CREATE INDEX IF NOT EXISTS idx_user_availability_user_id ON user_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_workspace_id ON user_availability(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_start_time ON user_availability(start_time);
CREATE INDEX IF NOT EXISTS idx_user_availability_end_time ON user_availability(end_time);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_workspace_id ON meeting_rooms(workspace_id);

CREATE INDEX IF NOT EXISTS idx_meeting_room_bookings_room_id ON meeting_room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_room_bookings_event_id ON meeting_room_bookings(event_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_attendees_updated_at ON event_attendees;
CREATE TRIGGER update_event_attendees_updated_at
    BEFORE UPDATE ON event_attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_availability_updated_at ON user_availability;
CREATE TRIGGER update_user_availability_updated_at
    BEFORE UPDATE ON user_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_rooms_updated_at ON meeting_rooms;
CREATE TRIGGER update_meeting_rooms_updated_at
    BEFORE UPDATE ON meeting_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check for event conflicts
CREATE OR REPLACE FUNCTION check_event_conflicts(
    p_user_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    event_id UUID,
    event_title VARCHAR(255),
    event_start TIMESTAMP WITH TIME ZONE,
    event_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.title,
        ce.start_time,
        ce.end_time
    FROM calendar_events ce
    INNER JOIN event_attendees ea ON ce.id = ea.event_id
    WHERE ea.user_id = p_user_id
    AND ea.status IN ('accepted', 'no_response')
    AND ce.id != COALESCE(p_exclude_event_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
        (ce.start_time >= p_start_time AND ce.start_time < p_end_time)
        OR (ce.end_time > p_start_time AND ce.end_time <= p_end_time)
        OR (ce.start_time <= p_start_time AND ce.end_time >= p_end_time)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's calendar events for a date range
CREATE OR REPLACE FUNCTION get_user_calendar_events(
    p_user_id UUID,
    p_workspace_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    event_id UUID,
    title VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN,
    color VARCHAR(50),
    attendee_status VARCHAR(50),
    is_organizer BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.title,
        ce.description,
        ce.location,
        ce.start_time,
        ce.end_time,
        ce.all_day,
        ce.color,
        ea.status,
        ea.is_organizer
    FROM calendar_events ce
    INNER JOIN event_attendees ea ON ce.id = ea.event_id
    WHERE ce.workspace_id = p_workspace_id
    AND ea.user_id = p_user_id
    AND (
        (ce.start_time >= p_start_date AND ce.start_time < p_end_date)
        OR (ce.end_time > p_start_date AND ce.end_time <= p_end_date)
        OR (ce.start_time <= p_start_date AND ce.end_time >= p_end_date)
    )
    ORDER BY ce.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE calendar_events IS 'Calendar events for workspace scheduling and meetings';
COMMENT ON TABLE event_attendees IS 'Attendees and their RSVP status for calendar events';
COMMENT ON TABLE event_reminders IS 'Reminders for upcoming events';
COMMENT ON TABLE user_availability IS 'User availability and busy status blocks';
COMMENT ON TABLE meeting_rooms IS 'Physical or virtual meeting rooms for booking';
COMMENT ON TABLE meeting_room_bookings IS 'Meeting room reservations for events';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
