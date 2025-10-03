-- Sprint 4 Migration: File Uploads, Reminders, and Scheduled Messages
-- Created: 2025-09-30

-- 1. Attachments Table (for file uploads)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_type VARCHAR(50), -- 'image', 'video', 'audio', 'document', 'other'
  thumbnail_path VARCHAR(500),
  width INTEGER, -- for images/videos
  height INTEGER, -- for images/videos
  duration INTEGER, -- for audio/videos (in seconds)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader_id ON attachments(uploader_id);
CREATE INDEX IF NOT EXISTS idx_attachments_workspace_id ON attachments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attachments_file_type ON attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);

-- 2. Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  dm_group_id UUID REFERENCES dm_groups(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reminder_text TEXT NOT NULL,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
  recurring_pattern VARCHAR(100), -- 'daily', 'weekly', 'monthly', or cron expression
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_workspace_id ON reminders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(status, remind_at) WHERE status = 'pending';

-- 3. Scheduled Messages Table
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  dm_group_id UUID REFERENCES dm_groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'cancelled', 'failed'
  sent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  CHECK (channel_id IS NOT NULL OR dm_group_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user_id ON scheduled_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_workspace_id ON scheduled_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_at ON scheduled_messages(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending ON scheduled_messages(status, scheduled_at) WHERE status = 'pending';

-- 4. Slash Commands Table (for custom workspace commands)
CREATE TABLE IF NOT EXISTS slash_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  command_name VARCHAR(100) NOT NULL,
  description TEXT,
  usage_hint VARCHAR(255),
  command_type VARCHAR(50) NOT NULL, -- 'built-in', 'webhook', 'custom'
  webhook_url VARCHAR(500),
  response_type VARCHAR(50) DEFAULT 'ephemeral', -- 'ephemeral', 'in_channel'
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, command_name)
);

CREATE INDEX IF NOT EXISTS idx_slash_commands_workspace_id ON slash_commands(workspace_id);
CREATE INDEX IF NOT EXISTS idx_slash_commands_enabled ON slash_commands(workspace_id, is_enabled);

-- 5. Command Logs Table (for tracking command usage)
CREATE TABLE IF NOT EXISTS command_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command_id UUID REFERENCES slash_commands(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  command_text TEXT NOT NULL,
  response TEXT,
  status VARCHAR(50), -- 'success', 'error', 'pending'
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_command_logs_workspace_id ON command_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_created_at ON command_logs(created_at);

-- 6. Add support for message metadata (for rich text formatting)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS formatting JSONB DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;

-- 7. Create function to mark message as having attachments
CREATE OR REPLACE FUNCTION update_message_attachments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE messages
  SET has_attachments = (
    SELECT COUNT(*) > 0
    FROM attachments
    WHERE message_id = NEW.message_id
  )
  WHERE id = NEW.message_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for attachment tracking
DROP TRIGGER IF EXISTS trigger_update_message_attachments ON attachments;
CREATE TRIGGER trigger_update_message_attachments
AFTER INSERT OR DELETE ON attachments
FOR EACH ROW
EXECUTE FUNCTION update_message_attachments();

-- 9. Email Preferences Table
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  digest_frequency VARCHAR(50) DEFAULT 'daily', -- 'none', 'daily', 'weekly'
  mention_alerts BOOLEAN DEFAULT true,
  dm_alerts BOOLEAN DEFAULT true,
  digest_time VARCHAR(10) DEFAULT '09:00', -- HH:MM format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_workspace_id ON email_preferences(workspace_id);
