-- CRM System Tables
-- Comprehensive customer relationship management

-- Companies/Organizations table
CREATE TABLE IF NOT EXISTS crm_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  industry VARCHAR(100),
  size VARCHAR(50), -- 'startup', 'small', 'medium', 'large', 'enterprise'
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  notes TEXT,
  tags TEXT[], -- Array of tags
  logo_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  twitter_url VARCHAR(500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table (linked to companies)
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  job_title VARCHAR(150),
  department VARCHAR(100),
  notes TEXT,
  tags TEXT[], -- Array of tags
  avatar_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  twitter_url VARCHAR(500),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  is_primary BOOLEAN DEFAULT false, -- Primary contact for company
  lead_source VARCHAR(100), -- 'website', 'referral', 'cold-call', 'event', etc.
  lead_status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'customer', 'lost'
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deals/Opportunities table
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value DECIMAL(15, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  stage VARCHAR(50) NOT NULL DEFAULT 'lead', -- 'lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  lost_reason TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table (calls, meetings, emails, notes)
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'call', 'meeting', 'email', 'note', 'task'
  subject VARCHAR(255),
  description TEXT,
  duration_minutes INTEGER, -- For calls and meetings
  outcome VARCHAR(100), -- 'successful', 'no-answer', 'follow-up-needed', etc.
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom fields definition table (for extensibility)
CREATE TABLE IF NOT EXISTS crm_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'contact', 'company', 'deal'
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(150) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'select', 'multiselect', 'boolean'
  field_options JSONB DEFAULT '[]', -- For select/multiselect types
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, entity_type, field_name)
);

-- Indexes for performance
CREATE INDEX idx_crm_companies_workspace ON crm_companies(workspace_id);
CREATE INDEX idx_crm_companies_name ON crm_companies(name);
CREATE INDEX idx_crm_contacts_workspace ON crm_contacts(workspace_id);
CREATE INDEX idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX idx_crm_contacts_name ON crm_contacts(first_name, last_name);
CREATE INDEX idx_crm_contacts_assigned ON crm_contacts(assigned_to);
CREATE INDEX idx_crm_deals_workspace ON crm_deals(workspace_id);
CREATE INDEX idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX idx_crm_deals_company ON crm_deals(company_id);
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX idx_crm_deals_assigned ON crm_deals(assigned_to);
CREATE INDEX idx_crm_activities_workspace ON crm_activities(workspace_id);
CREATE INDEX idx_crm_activities_contact ON crm_activities(contact_id);
CREATE INDEX idx_crm_activities_company ON crm_activities(company_id);
CREATE INDEX idx_crm_activities_deal ON crm_activities(deal_id);
CREATE INDEX idx_crm_activities_type ON crm_activities(type);
CREATE INDEX idx_crm_activities_scheduled ON crm_activities(scheduled_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_companies_updated_at BEFORE UPDATE ON crm_companies
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_activities_updated_at BEFORE UPDATE ON crm_activities
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- Sample data for testing
-- INSERT INTO crm_companies (workspace_id, name, industry, website) VALUES
--   ((SELECT id FROM workspaces LIMIT 1), 'Acme Corporation', 'Technology', 'https://acme.com');
