-- Marketing Features Migration
-- Add tables for tournament marketing tools

-- Email Campaigns table
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sent
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    recipient_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Media Posts table
CREATE TABLE social_media_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- twitter, facebook, instagram, linkedin
    content TEXT NOT NULL,
    media_url TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, published
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Graphics/Poster Templates table
CREATE TABLE poster_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- poster, banner, social_media
    design_data JSONB NOT NULL, -- Store design configuration
    preview_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsorships table
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(50) DEFAULT 'bronze', -- gold, silver, bronze, custom
    logo_url TEXT,
    website_url TEXT,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contribution_amount DECIMAL(10, 2),
    benefits TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, pending
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_campaigns_workspace ON email_campaigns(workspace_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_social_media_posts_workspace ON social_media_posts(workspace_id);
CREATE INDEX idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_media_posts_scheduled ON social_media_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_poster_templates_workspace ON poster_templates(workspace_id);
CREATE INDEX idx_sponsors_workspace ON sponsors(workspace_id);
CREATE INDEX idx_sponsors_status ON sponsors(status);

-- Add updated_at triggers
CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON email_campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_posts_updated_at
BEFORE UPDATE ON social_media_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_poster_templates_updated_at
BEFORE UPDATE ON poster_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at
BEFORE UPDATE ON sponsors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE email_campaigns IS 'Email marketing campaigns for tournaments';
COMMENT ON TABLE social_media_posts IS 'Social media posts for tournament promotion';
COMMENT ON TABLE poster_templates IS 'Graphics and poster templates';
COMMENT ON TABLE sponsors IS 'Tournament sponsors and partnerships';
