-- Marketing Sprints Migration
-- Add tables for sprint-based marketing campaign management

-- Marketing Sprints table
CREATE TABLE marketing_sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'planning', -- planning, active, completed, cancelled
    budget DECIMAL(10, 2),
    target_audience TEXT,
    kpis JSONB, -- Key performance indicators
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_sprint_dates CHECK (end_date >= start_date)
);

-- Sprint Tasks table
CREATE TABLE sprint_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES marketing_sprints(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL, -- content, design, social, email, sponsor, analytics, other
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, review, completed
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    dependencies JSONB, -- Array of task IDs this depends on
    checklist JSONB, -- Array of checklist items
    attachments JSONB, -- Array of file URLs
    -- Links to marketing assets
    email_campaign_id UUID REFERENCES email_campaigns(id),
    social_post_id UUID REFERENCES social_media_posts(id),
    poster_template_id UUID REFERENCES poster_templates(id),
    sponsor_id UUID REFERENCES sponsors(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sprint Members table (team assignments)
CREATE TABLE sprint_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES marketing_sprints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- lead, member, contributor
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sprint_id, user_id)
);

-- Sprint Metrics table (track performance)
CREATE TABLE sprint_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES marketing_sprints(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    email_sends INT DEFAULT 0,
    email_opens INT DEFAULT 0,
    email_clicks INT DEFAULT 0,
    social_posts INT DEFAULT 0,
    social_engagements INT DEFAULT 0,
    website_visits INT DEFAULT 0,
    conversions INT DEFAULT 0,
    sponsor_contacts INT DEFAULT 0,
    additional_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sprint_id, metric_date)
);

-- Sprint Comments table
CREATE TABLE sprint_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES marketing_sprints(id) ON DELETE CASCADE,
    task_id UUID REFERENCES sprint_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT comment_target CHECK (
        (sprint_id IS NOT NULL AND task_id IS NULL) OR
        (sprint_id IS NULL AND task_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX idx_marketing_sprints_workspace ON marketing_sprints(workspace_id);
CREATE INDEX idx_marketing_sprints_status ON marketing_sprints(status);
CREATE INDEX idx_marketing_sprints_dates ON marketing_sprints(start_date, end_date);

CREATE INDEX idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_status ON sprint_tasks(status);
CREATE INDEX idx_sprint_tasks_assigned ON sprint_tasks(assigned_to);
CREATE INDEX idx_sprint_tasks_type ON sprint_tasks(task_type);
CREATE INDEX idx_sprint_tasks_due_date ON sprint_tasks(due_date);

CREATE INDEX idx_sprint_members_sprint ON sprint_members(sprint_id);
CREATE INDEX idx_sprint_members_user ON sprint_members(user_id);

CREATE INDEX idx_sprint_metrics_sprint ON sprint_metrics(sprint_id);
CREATE INDEX idx_sprint_metrics_date ON sprint_metrics(metric_date);

CREATE INDEX idx_sprint_comments_sprint ON sprint_comments(sprint_id);
CREATE INDEX idx_sprint_comments_task ON sprint_comments(task_id);
CREATE INDEX idx_sprint_comments_user ON sprint_comments(user_id);

-- Add updated_at triggers
CREATE TRIGGER update_marketing_sprints_updated_at
BEFORE UPDATE ON marketing_sprints
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprint_tasks_updated_at
BEFORE UPDATE ON sprint_tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprint_comments_updated_at
BEFORE UPDATE ON sprint_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE marketing_sprints IS 'Sprint-based marketing campaign management';
COMMENT ON TABLE sprint_tasks IS 'Individual tasks and deliverables within marketing sprints';
COMMENT ON TABLE sprint_members IS 'Team members assigned to marketing sprints';
COMMENT ON TABLE sprint_metrics IS 'Daily performance metrics for marketing sprints';
COMMENT ON TABLE sprint_comments IS 'Comments on sprints and tasks';
