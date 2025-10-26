-- Migration: Add Salesforce-style CRM features
-- This enhances the existing CRM with leads, opportunities, forecasting, and advanced features

-- Lead Management (separate from contacts for proper lead-to-contact conversion)
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    title VARCHAR(100),
    website VARCHAR(255),

    -- Lead Details
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
    source VARCHAR(100), -- web, referral, trade show, etc.
    rating VARCHAR(20) CHECK (rating IN ('hot', 'warm', 'cold')),

    -- Scoring
    lead_score INTEGER DEFAULT 0,
    score_factors JSONB DEFAULT '{}',

    -- Assignment
    owner_id UUID REFERENCES users(id),

    -- Conversion tracking
    converted BOOLEAN DEFAULT FALSE,
    converted_date TIMESTAMP WITH TIME ZONE,
    converted_contact_id UUID REFERENCES crm_contacts(id),
    converted_account_id UUID REFERENCES crm_companies(id),
    converted_opportunity_id UUID,

    -- Additional fields
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    industry VARCHAR(100),
    employees INTEGER,
    revenue DECIMAL(15,2),
    description TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_date TIMESTAMP WITH TIME ZONE
);

-- Opportunities (Salesforce-style deals with forecasting)
CREATE TABLE IF NOT EXISTS crm_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    account_id UUID REFERENCES crm_companies(id),
    contact_id UUID REFERENCES crm_contacts(id),

    -- Opportunity Details
    amount DECIMAL(15,2),
    close_date DATE,
    stage VARCHAR(100) NOT NULL,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    type VARCHAR(50) CHECK (type IN ('new_business', 'existing_business', 'renewal')),

    -- Forecasting
    forecast_category VARCHAR(50) DEFAULT 'pipeline' CHECK (forecast_category IN ('pipeline', 'best_case', 'commit', 'closed')),
    expected_revenue DECIMAL(15,2), -- amount * probability / 100

    -- Tracking
    owner_id UUID REFERENCES users(id),
    lead_source VARCHAR(100),
    next_step TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
    closed_date TIMESTAMP WITH TIME ZONE,
    loss_reason TEXT,

    -- Additional
    description TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_date TIMESTAMP WITH TIME ZONE
);

-- Add foreign key for lead conversion
ALTER TABLE crm_leads ADD CONSTRAINT fk_converted_opportunity
    FOREIGN KEY (converted_opportunity_id) REFERENCES crm_opportunities(id) ON DELETE SET NULL;

-- Opportunity Products/Line Items
CREATE TABLE IF NOT EXISTS crm_opportunity_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15,2),
    discount DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(15,2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sales Stages (configurable per workspace)
CREATE TABLE IF NOT EXISTS crm_sales_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    probability INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    is_won BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email Integration
CREATE TABLE IF NOT EXISTS crm_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Email Details
    subject VARCHAR(500),
    body TEXT,
    from_email VARCHAR(255),
    to_emails TEXT[],
    cc_emails TEXT[],
    bcc_emails TEXT[],

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'bounced', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    open_count INTEGER DEFAULT 0,

    -- Relations
    lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,

    -- Tracking
    sent_by UUID REFERENCES users(id),

    -- Attachments
    attachments JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Campaign Management
CREATE TABLE IF NOT EXISTS crm_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('email', 'webinar', 'conference', 'trade_show', 'partner', 'advertisement', 'direct_mail', 'telemarketing', 'other')),
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'aborted')),

    -- Campaign Details
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    expected_revenue DECIMAL(15,2),
    expected_responses INTEGER,

    -- Performance
    num_sent INTEGER DEFAULT 0,
    num_leads INTEGER DEFAULT 0,
    num_converted INTEGER DEFAULT 0,
    num_opportunities INTEGER DEFAULT 0,
    num_won INTEGER DEFAULT 0,

    description TEXT,
    owner_id UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Campaign Members
CREATE TABLE IF NOT EXISTS crm_campaign_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'sent',
    responded BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CHECK ((lead_id IS NOT NULL AND contact_id IS NULL) OR (lead_id IS NULL AND contact_id IS NOT NULL))
);

-- Territory Management
CREATE TABLE IF NOT EXISTS crm_territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_territory_id UUID REFERENCES crm_territories(id),

    -- Rules (stored as JSON for flexibility)
    assignment_rules JSONB DEFAULT '{}', -- e.g., {"states": ["CA", "NV"], "industries": ["Tech"]}

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Territory Assignments
CREATE TABLE IF NOT EXISTS crm_territory_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    territory_id UUID NOT NULL REFERENCES crm_territories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(territory_id, user_id)
);

-- Enhanced Activities (extend existing)
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE CASCADE;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS outcome VARCHAR(50);
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS is_logged BOOLEAN DEFAULT TRUE; -- true for past activities, false for scheduled
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP WITH TIME ZONE;

-- Enhance Companies (Accounts in Salesforce)
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES crm_companies(id);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) CHECK (account_type IN ('customer', 'partner', 'competitor', 'prospect'));
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS ownership VARCHAR(50);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS sic_code VARCHAR(20);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS ticker_symbol VARCHAR(10);
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS rating VARCHAR(20) CHECK (rating IN ('hot', 'warm', 'cold'));

-- Enhance Contacts
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS assistant_name VARCHAR(100);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS assistant_phone VARCHAR(50);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES crm_contacts(id);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS mailing_address TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS do_not_call BOOLEAN DEFAULT FALSE;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_workspace ON crm_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_score ON crm_leads(lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_workspace ON crm_opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_owner ON crm_opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_account ON crm_opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_close_date ON crm_opportunities(close_date);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_forecast ON crm_opportunities(forecast_category);

CREATE INDEX IF NOT EXISTS idx_crm_emails_workspace ON crm_emails(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_lead ON crm_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_contact ON crm_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_emails_opportunity ON crm_emails(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_crm_campaigns_workspace ON crm_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON crm_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_opportunity ON crm_activities(opportunity_id);

-- Update triggers
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_leads_updated_at_trigger
    BEFORE UPDATE ON crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_opportunities_updated_at_trigger
    BEFORE UPDATE ON crm_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_emails_updated_at_trigger
    BEFORE UPDATE ON crm_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_campaigns_updated_at_trigger
    BEFORE UPDATE ON crm_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER crm_territories_updated_at_trigger
    BEFORE UPDATE ON crm_territories
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_updated_at();

-- Function to calculate expected revenue
CREATE OR REPLACE FUNCTION calculate_opportunity_expected_revenue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amount IS NOT NULL AND NEW.probability IS NOT NULL THEN
        NEW.expected_revenue := NEW.amount * (NEW.probability::DECIMAL / 100);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunity_expected_revenue_trigger
    BEFORE INSERT OR UPDATE ON crm_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION calculate_opportunity_expected_revenue();
