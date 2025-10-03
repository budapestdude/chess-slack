-- Migration for Sprint 1 Channel Features
-- Run this migration to add support for:
-- 1. Channel Muting (uses existing notifications_enabled field in channel_members)
-- 2. Starred Channels
-- 3. Message Bookmarking

-- Starred channels table
CREATE TABLE IF NOT EXISTS starred_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    starred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- Bookmarked messages table
CREATE TABLE IF NOT EXISTS bookmarked_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    dm_group_id UUID REFERENCES dm_groups(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    UNIQUE(user_id, message_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_starred_channels_user_id ON starred_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_channels_channel_id ON starred_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_messages_user_id ON bookmarked_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_messages_message_id ON bookmarked_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_messages_channel_id ON bookmarked_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_messages_dm_group_id ON bookmarked_messages(dm_group_id);