-- Add meeting notes system
-- This migration creates tables for storing meeting notes with attendees, agenda, and action items

-- Create meeting_notes table
CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  attendees JSONB DEFAULT '[]'::jsonb,
  agenda JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  template VARCHAR(100) DEFAULT 'general',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_meeting_notes_workspace ON meeting_notes(workspace_id);
CREATE INDEX idx_meeting_notes_date ON meeting_notes(date);
CREATE INDEX idx_meeting_notes_created_by ON meeting_notes(created_by);
CREATE INDEX idx_meeting_notes_created_at ON meeting_notes(created_at DESC);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_meeting_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_notes_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_notes_updated_at();

-- Add comment to table
COMMENT ON TABLE meeting_notes IS 'Stores meeting notes with attendees, agenda items, notes content, and action items';
COMMENT ON COLUMN meeting_notes.attendees IS 'JSON array of attendee names';
COMMENT ON COLUMN meeting_notes.agenda IS 'JSON array of agenda items';
COMMENT ON COLUMN meeting_notes.action_items IS 'JSON array of action items with id, text, assignee, and completed status';
COMMENT ON COLUMN meeting_notes.template IS 'Template type used for the meeting notes (general, standup, retrospective, planning, etc.)';
