-- Migration 007: Agent System Tables
-- This migration creates the foundation for the AI agent-based collaborative system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENT DEFINITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'boss', 'code-validator', 'ui-designer', 'general-purpose', 'database-specialist', 'test-engineer'
    description TEXT,
    status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'busy', 'error', 'offline'
    capabilities JSONB DEFAULT '[]', -- Array of capability strings
    configuration JSONB DEFAULT '{}', -- Agent-specific config (API keys, model preferences, etc.)
    metrics JSONB DEFAULT '{}', -- Performance metrics (tasks_completed, success_rate, etc.)
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AGENT TASKS/PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    assigned_to_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_type VARCHAR(100), -- 'feature', 'bug', 'refactor', 'test', 'documentation', 'review'
    priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled'
    context JSONB DEFAULT '{}', -- Task-specific context (files to modify, dependencies, etc.)
    requirements JSONB DEFAULT '[]', -- Acceptance criteria
    results JSONB DEFAULT '{}', -- Output from task execution
    error_log TEXT,
    estimated_effort INT, -- In minutes
    actual_effort INT, -- In minutes
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AGENT TASK DEPENDENCIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'blocks', -- 'blocks', 'related', 'subtask'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id),
    -- Prevent circular dependencies
    CHECK (task_id != depends_on_task_id)
);

-- ============================================
-- AGENT EXECUTION LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'file_created', 'file_modified', 'test_run', 'command_executed', etc.
    details JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    output TEXT,
    error TEXT,
    duration_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AGENT CONVERSATIONS/THREADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL, -- Optional: link to a channel for visibility
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AGENT CONVERSATION MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL, -- 'agent', 'user', 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (agent_id IS NOT NULL OR user_id IS NOT NULL)
);

-- ============================================
-- PROJECT ARTIFACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
    created_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    artifact_type VARCHAR(100), -- 'code', 'config', 'documentation', 'test', 'design'
    file_path TEXT NOT NULL,
    content TEXT,
    language VARCHAR(50), -- Programming language or file type
    version INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'deployed'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CODE REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS code_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES project_artifacts(id) ON DELETE CASCADE,
    reviewer_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    reviewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'changes_requested', 'rejected'
    comments TEXT,
    issues JSONB DEFAULT '[]', -- Array of issues found
    suggestions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (reviewer_agent_id IS NOT NULL OR reviewer_user_id IS NOT NULL)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents(created_by);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace_id ON agent_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assigned_to ON agent_tasks(assigned_to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_by ON agent_tasks(created_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_parent_id ON agent_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_due_date ON agent_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_agent_task_deps_task_id ON agent_task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_deps_depends_on ON agent_task_dependencies(depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_agent_id ON agent_execution_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_task_id ON agent_execution_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_created_at ON agent_execution_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_workspace_id ON agent_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_task_id ON agent_conversations(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_channel_id ON agent_conversations(channel_id);

CREATE INDEX IF NOT EXISTS idx_agent_conv_messages_conversation_id ON agent_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_messages_agent_id ON agent_conversation_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_messages_user_id ON agent_conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_messages_created_at ON agent_conversation_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_project_artifacts_workspace_id ON project_artifacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_task_id ON project_artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_file_path ON project_artifacts(file_path);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_status ON project_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_created_by ON project_artifacts(created_by_agent_id);

CREATE INDEX IF NOT EXISTS idx_code_reviews_artifact_id ON code_reviews(artifact_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_reviewer_agent ON code_reviews(reviewer_agent_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_reviewer_user ON code_reviews(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_status ON code_reviews(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_tasks_updated_at ON agent_tasks;
CREATE TRIGGER update_agent_tasks_updated_at
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_conversations_updated_at ON agent_conversations;
CREATE TRIGGER update_agent_conversations_updated_at
    BEFORE UPDATE ON agent_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_artifacts_updated_at ON project_artifacts;
CREATE TRIGGER update_project_artifacts_updated_at
    BEFORE UPDATE ON project_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_code_reviews_updated_at ON code_reviews;
CREATE TRIGGER update_code_reviews_updated_at
    BEFORE UPDATE ON code_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER FOR TASK STATUS CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO agent_execution_logs (agent_id, task_id, action, details, success)
        VALUES (
            NEW.assigned_to_agent_id,
            NEW.id,
            'task_status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'task_title', NEW.title
            ),
            true
        );

        -- Update started_at timestamp when task moves to in_progress
        IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
            NEW.started_at = NOW();
        END IF;

        -- Update completed_at timestamp when task completes or fails
        IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
            NEW.completed_at = NOW();

            -- Calculate actual effort if started_at is set
            IF NEW.started_at IS NOT NULL THEN
                NEW.actual_effort = EXTRACT(EPOCH FROM (NOW() - NEW.started_at)) / 60;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_status_change_trigger ON agent_tasks;
CREATE TRIGGER task_status_change_trigger
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_status_change();

-- ============================================
-- TRIGGER FOR AGENT METRICS UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_metrics()
RETURNS TRIGGER AS $$
DECLARE
    total_tasks INT;
    completed_tasks INT;
    failed_tasks INT;
    avg_effort NUMERIC;
BEGIN
    -- Only update metrics when a task is completed or failed
    IF NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed') AND NEW.assigned_to_agent_id IS NOT NULL THEN
        -- Calculate metrics
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'completed'),
            COUNT(*) FILTER (WHERE status = 'failed'),
            AVG(actual_effort) FILTER (WHERE actual_effort IS NOT NULL)
        INTO total_tasks, completed_tasks, failed_tasks, avg_effort
        FROM agent_tasks
        WHERE assigned_to_agent_id = NEW.assigned_to_agent_id
        AND status IN ('completed', 'failed');

        -- Update agent metrics
        UPDATE agents
        SET metrics = jsonb_build_object(
            'total_tasks', total_tasks,
            'completed_tasks', completed_tasks,
            'failed_tasks', failed_tasks,
            'success_rate', CASE WHEN total_tasks > 0 THEN ROUND((completed_tasks::NUMERIC / total_tasks) * 100, 2) ELSE 0 END,
            'avg_effort_minutes', COALESCE(ROUND(avg_effort, 2), 0),
            'last_updated', NOW()
        )
        WHERE id = NEW.assigned_to_agent_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_metrics_update_trigger ON agent_tasks;
CREATE TRIGGER agent_metrics_update_trigger
    AFTER UPDATE ON agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_metrics();

-- ============================================
-- INITIAL DATA / SEED
-- ============================================
-- Note: Actual agent instances will be created by users through the UI
-- This migration only creates the schema

COMMENT ON TABLE agents IS 'AI agents that can autonomously execute tasks';
COMMENT ON TABLE agent_tasks IS 'Tasks created by boss agent and executed by worker agents';
COMMENT ON TABLE agent_task_dependencies IS 'Dependency relationships between tasks';
COMMENT ON TABLE agent_execution_logs IS 'Audit log of all agent actions';
COMMENT ON TABLE agent_conversations IS 'Conversations between agents and users';
COMMENT ON TABLE agent_conversation_messages IS 'Messages within agent conversations';
COMMENT ON TABLE project_artifacts IS 'Files and artifacts created by agents';
COMMENT ON TABLE code_reviews IS 'Code reviews performed by agents or users';
