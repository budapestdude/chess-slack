-- Add reference columns to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS dm_group_id UUID REFERENCES dm_groups(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mentions_enabled BOOLEAN DEFAULT true,
  dm_enabled BOOLEAN DEFAULT true,
  channel_messages_enabled BOOLEAN DEFAULT false,
  system_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_workspace ON notifications(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;