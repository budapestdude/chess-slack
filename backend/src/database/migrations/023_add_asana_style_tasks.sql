-- Migration: Add Asana-style task management system
-- This builds on the existing agent_tasks table with projects, sections, and enhanced features

-- Projects table for organizing tasks
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50), -- Icon name or emoji
    owner_id UUID NOT NULL REFERENCES users(id),
    default_view VARCHAR(20) DEFAULT 'list' CHECK (default_view IN ('list', 'board', 'timeline', 'calendar')),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project members for access control
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Sections within projects (for organizing tasks in list/board views)
CREATE TABLE IF NOT EXISTS project_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhance agent_tasks with project/section relationships
-- Note: We're adding columns to the existing agent_tasks table (many already exist)
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES project_sections(id) ON DELETE SET NULL;

-- Task dependencies (for timeline/gantt view)
-- Note: agent_task_dependencies already exists, so we'll skip creating it
-- CREATE TABLE IF NOT EXISTS task_dependencies ...

-- Subtasks (parent-child task relationships) - already exists in agent_tasks table

-- Task templates for recurring tasks
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_hours DECIMAL(5,2),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task activity log for audit trail
-- Note: task_activity already exists as a VIEW, we'll create a separate table
CREATE TABLE IF NOT EXISTS task_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'assigned', 'completed', 'commented', etc.
    field_name VARCHAR(100), -- Which field was changed
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Custom fields for tasks (extensibility)
CREATE TABLE IF NOT EXISTS task_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'dropdown', 'checkbox')),
    options JSONB, -- For dropdown options
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task custom field values
CREATE TABLE IF NOT EXISTS task_custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    custom_field_id UUID NOT NULL REFERENCES task_custom_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(task_id, custom_field_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_sections_project ON project_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_project ON agent_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_section ON agent_tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task ON task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_user ON task_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_task_custom_field_values_task ON task_custom_field_values(task_id);

-- Update trigger for projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at_trigger
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Update trigger for project_sections
CREATE TRIGGER project_sections_updated_at_trigger
    BEFORE UPDATE ON project_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Update trigger for task_templates
CREATE TRIGGER task_templates_updated_at_trigger
    BEFORE UPDATE ON task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Update trigger for task_custom_field_values
CREATE TRIGGER task_custom_field_values_updated_at_trigger
    BEFORE UPDATE ON task_custom_field_values
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
