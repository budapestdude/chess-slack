-- Add custom status fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS custom_status TEXT,
ADD COLUMN IF NOT EXISTS status_emoji VARCHAR(10),
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline', -- online, away, busy, offline
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster presence lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_activity ON user_presence(last_activity);

-- Create function to update presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update presence timestamp
CREATE TRIGGER trigger_update_presence_timestamp
BEFORE UPDATE ON user_presence
FOR EACH ROW
EXECUTE FUNCTION update_presence_timestamp();