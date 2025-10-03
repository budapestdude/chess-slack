-- Migration 008: Transform Agent Tasks to Team Collaboration System
-- This migration repurposes the agent task system for general team use
-- Adds user assignments, labels, comments, watchers, and custom statuses

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADD USER ASSIGNMENT TO TASKS
-- ============================================
-- Add assigned_to_user_id column to agent_tasks table
ALTER TABLE agent_tasks
ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for user assignments
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assigned_to_user ON agent_tasks(assigned_to_user_id);

-- Add comment to clarify dual assignment capability
COMMENT ON COLUMN agent_tasks.assigned_to_user_id IS 'User assigned to this task (alternative to agent assignment)';
COMMENT ON COLUMN agent_tasks.assigned_to_agent_id IS 'Agent assigned to this task (alternative to user assignment)';

-- ============================================
-- TASK LABELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT 'blue', -- Supported colors: blue, green, yellow, orange, red, purple, pink, gray, indigo, teal, lime, amber, rose, violet, cyan, emerald, fuchsia
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure unique label names per task
    UNIQUE(task_id, name)
);

-- Add indexes for task labels
CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_name ON task_labels(name);
CREATE INDEX IF NOT EXISTS idx_task_labels_color ON task_labels(color);

COMMENT ON TABLE task_labels IS 'Colored labels/tags for categorizing and filtering tasks';

-- ============================================
-- TASK COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure either user or agent is set
    CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

-- Add indexes for task comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_agent_id ON task_comments(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE task_comments IS 'Comments and discussions on tasks by users or agents';

-- ============================================
-- TASK WATCHERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_watchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure unique watcher per task
    UNIQUE(task_id, user_id)
);

-- Add indexes for task watchers
CREATE INDEX IF NOT EXISTS idx_task_watchers_task_id ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user_id ON task_watchers(user_id);

COMMENT ON TABLE task_watchers IS 'Users watching/following a task for notifications';

-- ============================================
-- WORKSPACE CUSTOM TASK STATUSES
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_task_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT 'gray',
    position INT NOT NULL DEFAULT 0, -- For ordering statuses
    is_default BOOLEAN DEFAULT false, -- Default status for new tasks
    is_completed BOOLEAN DEFAULT false, -- Indicates task completion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure unique status names per workspace
    UNIQUE(workspace_id, name)
);

-- Add indexes for workspace statuses
CREATE INDEX IF NOT EXISTS idx_workspace_statuses_workspace_id ON workspace_task_statuses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_statuses_position ON workspace_task_statuses(position);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_workspace_task_statuses_updated_at ON workspace_task_statuses;
CREATE TRIGGER update_workspace_task_statuses_updated_at
    BEFORE UPDATE ON workspace_task_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workspace_task_statuses IS 'Custom task statuses per workspace (alternative to default statuses)';

-- ============================================
-- TASK ATTACHMENTS TABLE (FUTURE)
-- ============================================
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT, -- In bytes
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for task attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id);

COMMENT ON TABLE task_attachments IS 'File attachments on tasks (images, documents, etc.)';

-- ============================================
-- TASK ACTIVITY LOG VIEW
-- ============================================
-- Create a view to unify task comments and status changes
CREATE OR REPLACE VIEW task_activity AS
SELECT
    c.id,
    c.task_id,
    'comment' AS activity_type,
    c.user_id,
    c.agent_id,
    c.content AS description,
    NULL AS metadata,
    c.created_at,
    c.updated_at
FROM task_comments c
UNION ALL
SELECT
    l.id,
    l.task_id,
    'status_change' AS activity_type,
    NULL AS user_id,
    l.agent_id,
    l.action || ': ' || (l.details->>'new_status') AS description,
    l.details AS metadata,
    l.created_at,
    l.created_at AS updated_at
FROM agent_execution_logs l
WHERE l.action = 'task_status_changed'
ORDER BY created_at DESC;

COMMENT ON VIEW task_activity IS 'Unified view of task comments and status changes for activity feeds';

-- ============================================
-- SEED DEFAULT WORKSPACE STATUSES
-- ============================================
-- Insert default statuses for existing workspaces
INSERT INTO workspace_task_statuses (workspace_id, name, color, position, is_default, is_completed)
SELECT
    id AS workspace_id,
    'To Do' AS name,
    'gray' AS color,
    0 AS position,
    true AS is_default,
    false AS is_completed
FROM workspaces
ON CONFLICT (workspace_id, name) DO NOTHING;

INSERT INTO workspace_task_statuses (workspace_id, name, color, position, is_default, is_completed)
SELECT
    id AS workspace_id,
    'In Progress' AS name,
    'blue' AS color,
    1 AS position,
    false AS is_default,
    false AS is_completed
FROM workspaces
ON CONFLICT (workspace_id, name) DO NOTHING;

INSERT INTO workspace_task_statuses (workspace_id, name, color, position, is_default, is_completed)
SELECT
    id AS workspace_id,
    'Done' AS name,
    'green' AS color,
    2 AS position,
    false AS is_default,
    true AS is_completed
FROM workspaces
ON CONFLICT (workspace_id, name) DO NOTHING;

-- ============================================
-- TRIGGER FOR TASK COMMENT NOTIFICATIONS
-- ============================================
-- Automatically add task creator and assignee as watchers when they comment
CREATE OR REPLACE FUNCTION auto_add_task_watcher()
RETURNS TRIGGER AS $$
BEGIN
    -- Add commenting user as watcher if not already watching
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO task_watchers (task_id, user_id)
        VALUES (NEW.task_id, NEW.user_id)
        ON CONFLICT (task_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_comment_watcher_trigger ON task_comments;
CREATE TRIGGER task_comment_watcher_trigger
    AFTER INSERT ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_task_watcher();

-- ============================================
-- UPDATE TASK METRICS TO INCLUDE USER ASSIGNMENTS
-- ============================================
-- Modify the agent metrics trigger to also track user-assigned tasks
CREATE OR REPLACE FUNCTION update_task_assignment_metrics()
RETURNS TRIGGER AS $$
DECLARE
    total_user_tasks INT;
    completed_user_tasks INT;
BEGIN
    -- Update metrics when a user-assigned task status changes
    IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') AND NEW.assigned_to_user_id IS NOT NULL THEN
        -- We could update user statistics here in the future
        -- For now, this is a placeholder for future user metrics tracking
        NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_user_assignment_metrics ON agent_tasks;
CREATE TRIGGER task_user_assignment_metrics
    AFTER UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_assignment_metrics();

-- ============================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================
-- Analyze tables to update statistics for query planner
ANALYZE task_labels;
ANALYZE task_comments;
ANALYZE task_watchers;
ANALYZE workspace_task_statuses;
ANALYZE task_attachments;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- This migration successfully transforms the agent-focused task system
-- into a flexible team collaboration platform while maintaining
-- backward compatibility with the existing agent system.
