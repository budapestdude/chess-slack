-- Performance Indexes for ChessSlack Database

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Workspaces indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- Workspace members indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user ON workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_channels_private ON channels(is_private);
CREATE INDEX IF NOT EXISTS idx_channels_archived ON channels(is_archived);

-- Channel members indexes
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_user ON channel_members(channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_dm_group_id ON messages(dm_group_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(is_deleted);

-- Full-text search indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Full-text search for channels
CREATE INDEX IF NOT EXISTS idx_channels_name_search ON channels USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(topic, '')));

-- Full-text search for users
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(to_tsvector('english', username || ' ' || display_name));

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- DM groups indexes
CREATE INDEX IF NOT EXISTS idx_dm_groups_workspace_id ON dm_groups(workspace_id);

-- DM group members indexes
CREATE INDEX IF NOT EXISTS idx_dm_group_members_group_user ON dm_group_members(dm_group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dm_group_members_user_id ON dm_group_members(user_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- User presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_activity ON user_presence(last_activity DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_messages_workspace_created ON messages(workspace_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_channels_workspace_archived ON channels(workspace_id, is_archived);

COMMENT ON INDEX idx_messages_content_search IS 'Full-text search index for message content';
COMMENT ON INDEX idx_channels_name_search IS 'Full-text search index for channel names and descriptions';
COMMENT ON INDEX idx_users_search IS 'Full-text search index for usernames and display names';