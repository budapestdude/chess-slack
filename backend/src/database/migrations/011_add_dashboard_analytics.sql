-- Migration 011: Dashboard and Analytics System
-- This migration adds analytics tracking and dashboard data aggregation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WORKSPACE ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    activity_type VARCHAR(100) NOT NULL, -- 'message_sent', 'task_created', 'document_edited', 'event_created', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'message', 'task', 'document', 'event', 'channel', etc.
    entity_id UUID, -- ID of the related entity

    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'deleted', 'completed', 'archived', etc.
    metadata JSONB DEFAULT '{}', -- Additional context (title, description, old/new values, etc.)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER ACTIVITY METRICS
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Message metrics
    messages_sent INT DEFAULT 0,
    messages_received INT DEFAULT 0,

    -- Task metrics
    tasks_created INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_assigned INT DEFAULT 0,

    -- Document metrics
    documents_created INT DEFAULT 0,
    documents_edited INT DEFAULT 0,
    documents_viewed INT DEFAULT 0,

    -- Event metrics
    events_created INT DEFAULT 0,
    events_attended INT DEFAULT 0,

    -- Engagement metrics
    active_time_minutes INT DEFAULT 0, -- Time spent active in workspace

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per user per workspace per day
    UNIQUE(user_id, workspace_id, date)
);

-- ============================================
-- WORKSPACE METRICS SUMMARY
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Overall metrics
    total_members INT DEFAULT 0,
    active_members INT DEFAULT 0, -- Members who performed any action

    -- Message metrics
    total_messages INT DEFAULT 0,
    total_channels INT DEFAULT 0,

    -- Task metrics
    total_tasks INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_in_progress INT DEFAULT 0,
    tasks_pending INT DEFAULT 0,

    -- Document metrics
    total_documents INT DEFAULT 0,
    documents_created_today INT DEFAULT 0,
    documents_edited_today INT DEFAULT 0,

    -- Event metrics
    total_events INT DEFAULT 0,
    events_today INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per workspace per day
    UNIQUE(workspace_id, date)
);

-- ============================================
-- TASK ANALYTICS VIEW
-- ============================================
CREATE OR REPLACE VIEW task_analytics AS
SELECT
    t.workspace_id,
    t.assigned_to_user_id AS user_id,
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE t.status = 'pending') AS pending_tasks,
    COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress_tasks,
    COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_tasks,
    COUNT(*) FILTER (WHERE t.status = 'failed') AS failed_tasks,
    COUNT(*) FILTER (WHERE t.status = 'cancelled') AS cancelled_tasks,
    AVG(CASE
        WHEN t.status = 'completed' AND t.started_at IS NOT NULL AND t.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600 -- Hours
        ELSE NULL
    END) AS avg_completion_time_hours,
    COUNT(*) FILTER (WHERE t.priority = 'critical') AS critical_priority_count,
    COUNT(*) FILTER (WHERE t.priority = 'high') AS high_priority_count,
    COUNT(*) FILTER (WHERE t.created_at >= NOW() - INTERVAL '7 days') AS tasks_created_last_7_days,
    COUNT(*) FILTER (WHERE t.completed_at >= NOW() - INTERVAL '7 days') AS tasks_completed_last_7_days
FROM agent_tasks t
WHERE t.assigned_to_user_id IS NOT NULL
GROUP BY t.workspace_id, t.assigned_to_user_id;

-- ============================================
-- DOCUMENT ANALYTICS VIEW
-- ============================================
CREATE OR REPLACE VIEW document_analytics AS
SELECT
    d.workspace_id,
    d.created_by AS user_id,
    COUNT(*) AS total_documents,
    COUNT(*) FILTER (WHERE d.doc_type = 'document') AS document_count,
    COUNT(*) FILTER (WHERE d.doc_type = 'wiki') AS wiki_count,
    COUNT(*) FILTER (WHERE d.doc_type = 'note') AS note_count,
    COUNT(*) FILTER (WHERE d.doc_type = 'folder') AS folder_count,
    COUNT(*) FILTER (WHERE d.is_archived = false) AS active_documents,
    COUNT(*) FILTER (WHERE d.is_archived = true) AS archived_documents,
    COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '7 days') AS documents_created_last_7_days,
    COUNT(*) FILTER (WHERE d.updated_at >= NOW() - INTERVAL '7 days') AS documents_updated_last_7_days
FROM documents d
GROUP BY d.workspace_id, d.created_by;

-- ============================================
-- EVENT ANALYTICS VIEW
-- ============================================
CREATE OR REPLACE VIEW event_analytics AS
SELECT
    ce.workspace_id,
    ce.created_by AS user_id,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE ce.start_time >= NOW()) AS upcoming_events,
    COUNT(*) FILTER (WHERE ce.start_time < NOW()) AS past_events,
    COUNT(*) FILTER (WHERE ce.is_recurring = true) AS recurring_events,
    COUNT(*) FILTER (WHERE ce.all_day = true) AS all_day_events,
    COUNT(*) FILTER (WHERE ce.start_time >= NOW() AND ce.start_time < NOW() + INTERVAL '7 days') AS events_next_7_days,
    AVG(EXTRACT(EPOCH FROM (ce.end_time - ce.start_time)) / 3600) AS avg_event_duration_hours
FROM calendar_events ce
GROUP BY ce.workspace_id, ce.created_by;

-- ============================================
-- WORKSPACE OVERVIEW VIEW
-- ============================================
CREATE OR REPLACE VIEW workspace_overview AS
SELECT
    w.id AS workspace_id,
    w.name AS workspace_name,

    -- Member stats
    (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS total_members,
    (SELECT COUNT(*) FROM workspace_members wm
     INNER JOIN user_presence up ON wm.user_id = up.user_id
     WHERE wm.workspace_id = w.id AND up.status = 'online') AS online_members,

    -- Channel stats
    (SELECT COUNT(*) FROM channels WHERE workspace_id = w.id AND is_archived = false) AS total_channels,
    (SELECT COUNT(*) FROM channels WHERE workspace_id = w.id AND is_private = false AND is_archived = false) AS public_channels,

    -- Message stats
    (SELECT COUNT(*) FROM messages m
     INNER JOIN channels c ON m.channel_id = c.id
     WHERE c.workspace_id = w.id) AS total_messages,
    (SELECT COUNT(*) FROM messages m
     INNER JOIN channels c ON m.channel_id = c.id
     WHERE c.workspace_id = w.id AND m.created_at >= NOW() - INTERVAL '24 hours') AS messages_last_24h,

    -- Task stats
    (SELECT COUNT(*) FROM agent_tasks WHERE workspace_id = w.id) AS total_tasks,
    (SELECT COUNT(*) FROM agent_tasks WHERE workspace_id = w.id AND status = 'completed') AS completed_tasks,
    (SELECT COUNT(*) FROM agent_tasks WHERE workspace_id = w.id AND status = 'in_progress') AS in_progress_tasks,
    (SELECT COUNT(*) FROM agent_tasks WHERE workspace_id = w.id AND status = 'pending') AS pending_tasks,

    -- Document stats
    (SELECT COUNT(*) FROM documents WHERE workspace_id = w.id AND is_archived = false) AS total_documents,
    (SELECT COUNT(*) FROM documents WHERE workspace_id = w.id AND is_archived = false AND created_at >= NOW() - INTERVAL '7 days') AS documents_created_last_7_days,

    -- Event stats
    (SELECT COUNT(*) FROM calendar_events WHERE workspace_id = w.id) AS total_events,
    (SELECT COUNT(*) FROM calendar_events WHERE workspace_id = w.id AND start_time >= NOW() AND start_time < NOW() + INTERVAL '7 days') AS events_next_7_days
FROM workspaces w;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace_id ON workspace_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_user_id ON workspace_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_type ON workspace_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_entity_type ON workspace_activity(entity_type);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_created_at ON workspace_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_user_id ON user_activity_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_workspace_id ON user_activity_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_date ON user_activity_metrics(date);

CREATE INDEX IF NOT EXISTS idx_workspace_metrics_workspace_id ON workspace_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_metrics_date ON workspace_metrics(date);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_user_activity_metrics_updated_at ON user_activity_metrics;
CREATE TRIGGER update_user_activity_metrics_updated_at
    BEFORE UPDATE ON user_activity_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_metrics_updated_at ON workspace_metrics;
CREATE TRIGGER update_workspace_metrics_updated_at
    BEFORE UPDATE ON workspace_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to log workspace activity
CREATE OR REPLACE FUNCTION log_workspace_activity(
    p_workspace_id UUID,
    p_user_id UUID,
    p_activity_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_action VARCHAR,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO workspace_activity (
        workspace_id,
        user_id,
        activity_type,
        entity_type,
        entity_id,
        action,
        metadata
    ) VALUES (
        p_workspace_id,
        p_user_id,
        p_activity_type,
        p_entity_type,
        p_entity_id,
        p_action,
        p_metadata
    ) RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent workspace activity
CREATE OR REPLACE FUNCTION get_recent_activity(
    p_workspace_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    username VARCHAR,
    display_name VARCHAR,
    avatar_url TEXT,
    activity_type VARCHAR,
    entity_type VARCHAR,
    entity_id UUID,
    action VARCHAR,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wa.id,
        wa.user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        wa.activity_type,
        wa.entity_type,
        wa.entity_id,
        wa.action,
        wa.metadata,
        wa.created_at
    FROM workspace_activity wa
    LEFT JOIN users u ON wa.user_id = u.id
    WHERE wa.workspace_id = p_workspace_id
    ORDER BY wa.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get user productivity summary
CREATE OR REPLACE FUNCTION get_user_productivity(
    p_user_id UUID,
    p_workspace_id UUID,
    p_days INT DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    messages_sent INT,
    tasks_completed INT,
    documents_edited INT,
    events_attended INT,
    active_time_minutes INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uam.date,
        uam.messages_sent,
        uam.tasks_completed,
        uam.documents_edited,
        uam.events_attended,
        uam.active_time_minutes
    FROM user_activity_metrics uam
    WHERE uam.user_id = p_user_id
    AND uam.workspace_id = p_workspace_id
    AND uam.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    ORDER BY uam.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get workspace activity summary
CREATE OR REPLACE FUNCTION get_workspace_activity_summary(
    p_workspace_id UUID,
    p_days INT DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    total_members INT,
    active_members INT,
    total_messages INT,
    tasks_completed INT,
    documents_created INT,
    events_created INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wm.date,
        wm.total_members,
        wm.active_members,
        wm.total_messages,
        wm.tasks_completed,
        wm.documents_created_today,
        wm.events_today
    FROM workspace_metrics wm
    WHERE wm.workspace_id = p_workspace_id
    AND wm.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    ORDER BY wm.date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE workspace_activity IS 'Activity log for all workspace actions for dashboard feed';
COMMENT ON TABLE user_activity_metrics IS 'Daily aggregated metrics per user for productivity tracking';
COMMENT ON TABLE workspace_metrics IS 'Daily aggregated metrics per workspace for analytics dashboard';
COMMENT ON VIEW task_analytics IS 'Aggregated task statistics per user per workspace';
COMMENT ON VIEW document_analytics IS 'Aggregated document statistics per user per workspace';
COMMENT ON VIEW event_analytics IS 'Aggregated event statistics per user per workspace';
COMMENT ON VIEW workspace_overview IS 'Real-time workspace statistics for dashboard';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
