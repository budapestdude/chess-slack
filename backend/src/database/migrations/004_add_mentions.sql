-- Create mentions table for tracking @mentions in messages
CREATE TABLE IF NOT EXISTS message_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mention_type VARCHAR(20) NOT NULL, -- 'user', 'channel', 'here'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster mention lookups
CREATE INDEX IF NOT EXISTS idx_mentions_message_id ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_mentions_user_id ON message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_user_unread ON message_mentions(mentioned_user_id, created_at DESC);

-- Add UNIQUE constraint to prevent duplicate mentions in the same message
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentions_unique ON message_mentions(message_id, mentioned_user_id)
WHERE mentioned_user_id IS NOT NULL;