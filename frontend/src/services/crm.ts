import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ===========================================================================
// TYPES
// ===========================================================================

export interface CRMCompany {
  id: string;
  workspace_id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  notes?: string;
  tags?: string[];
  logo_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  contact_count?: number;
  deal_count?: number;
  contacts?: CRMContact[];
}

export interface CRMContact {
  id: string;
  workspace_id: string;
  company_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  notes?: string;
  tags?: string[];
  avatar_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_primary?: boolean;
  lead_source?: string;
  lead_status?: string;
  created_by?: string;
  assigned_to?: string;
  created_at: Date;
  updated_at: Date;
  company_name?: string;
  company_website?: string;
  deal_count?: number;
  deals?: CRMDeal[];
}

export interface CRMDeal {
  id: string;
  workspace_id: string;
  contact_id?: string;
  company_id?: string;
  title: string;
  description?: string;
  value: number;
  currency?: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  lost_reason?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  created_by?: string;
  assigned_to?: string;
  created_at: Date;
  updated_at: Date;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  company_website?: string;
}

export interface CRMActivity {
  id: string;
  workspace_id: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  type: 'call' | 'meeting' | 'email' | 'note' | 'task';
  subject?: string;
  description?: string;
  duration_minutes?: number;
  outcome?: string;
  scheduled_at?: Date;
  completed_at?: Date;
  is_completed: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  contact_first_name?: string;
  contact_last_name?: string;
  company_name?: string;
  deal_title?: string;
}

export interface CRMStats {
  contacts: {
    total_contacts: number;
    new_leads: number;
    contacted: number;
    qualified: number;
    customers: number;
  };
  companies: {
    total_companies: number;
  };
  deals: {
    total_deals: number;
    total_revenue: number;
    pipeline_value: number;
    weighted_pipeline: number;
    leads: number;
    qualified: number;
    proposals: number;
    negotiations: number;
    won: number;
    lost: number;
  };
}

// ===========================================================================
// COMPANIES API
// ===========================================================================

export const createCompany = async (
  workspaceId: string,
  data: Partial<CRMCompany>
): Promise<CRMCompany> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/companies`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getCompanies = async (
  workspaceId: string,
  params?: { search?: string; industry?: string; size?: string; limit?: number; offset?: number }
): Promise<CRMCompany[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/companies`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getCompany = async (workspaceId: string, companyId: string): Promise<CRMCompany> => {
  const response = await axios.get(
    `${API_URL}/api/crm/${workspaceId}/companies/${companyId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateCompany = async (
  workspaceId: string,
  companyId: string,
  data: Partial<CRMCompany>
): Promise<CRMCompany> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/companies/${companyId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteCompany = async (workspaceId: string, companyId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/companies/${companyId}`, {
    headers: getAuthHeaders(),
  });
};

// ===========================================================================
// CONTACTS API
// ===========================================================================

export const createContact = async (
  workspaceId: string,
  data: Partial<CRMContact>
): Promise<CRMContact> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/contacts`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getContacts = async (
  workspaceId: string,
  params?: {
    search?: string;
    company_id?: string;
    lead_status?: string;
    assigned_to?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<CRMContact[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/contacts`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getContact = async (workspaceId: string, contactId: string): Promise<CRMContact> => {
  const response = await axios.get(
    `${API_URL}/api/crm/${workspaceId}/contacts/${contactId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateContact = async (
  workspaceId: string,
  contactId: string,
  data: Partial<CRMContact>
): Promise<CRMContact> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/contacts/${contactId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteContact = async (workspaceId: string, contactId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/contacts/${contactId}`, {
    headers: getAuthHeaders(),
  });
};

// ===========================================================================
// DEALS API
// ===========================================================================

export const createDeal = async (
  workspaceId: string,
  data: Partial<CRMDeal>
): Promise<CRMDeal> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/deals`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getDeals = async (
  workspaceId: string,
  params?: {
    search?: string;
    stage?: string;
    contact_id?: string;
    company_id?: string;
    assigned_to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CRMDeal[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/deals`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getDeal = async (workspaceId: string, dealId: string): Promise<CRMDeal> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/deals/${dealId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateDeal = async (
  workspaceId: string,
  dealId: string,
  data: Partial<CRMDeal>
): Promise<CRMDeal> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/deals/${dealId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteDeal = async (workspaceId: string, dealId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/deals/${dealId}`, {
    headers: getAuthHeaders(),
  });
};

// ===========================================================================
// ACTIVITIES API
// ===========================================================================

export const createActivity = async (
  workspaceId: string,
  data: Partial<CRMActivity>
): Promise<CRMActivity> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/activities`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getActivities = async (
  workspaceId: string,
  params?: {
    contact_id?: string;
    company_id?: string;
    deal_id?: string;
    type?: string;
    is_completed?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<CRMActivity[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/activities`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateActivity = async (
  workspaceId: string,
  activityId: string,
  data: Partial<CRMActivity>
): Promise<CRMActivity> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/activities/${activityId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteActivity = async (workspaceId: string, activityId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/activities/${activityId}`, {
    headers: getAuthHeaders(),
  });
};

// ===========================================================================
// ANALYTICS API
// ===========================================================================

export const getCRMStats = async (workspaceId: string): Promise<CRMStats> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/stats`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// ===========================================================================
// SALESFORCE-STYLE FEATURES
// ===========================================================================

// Leads Types
export interface CRMLead {
  id: string;
  workspace_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  website?: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  source?: string;
  rating?: 'hot' | 'warm' | 'cold';
  lead_score?: number;
  score_factors?: any;
  owner_id?: string;
  converted?: boolean;
  converted_date?: Date;
  converted_contact_id?: string;
  converted_account_id?: string;
  converted_opportunity_id?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  industry?: string;
  employees?: number;
  revenue?: number;
  description?: string;
  tags?: string[];
  custom_fields?: any;
  created_at?: Date;
  updated_at?: Date;
  last_activity_date?: Date;
  owner_name?: string;
  activity_count?: number;
}

// Opportunity Types
export interface CRMOpportunity {
  id: string;
  workspace_id: string;
  name: string;
  account_id?: string;
  contact_id?: string;
  amount?: number;
  close_date?: Date;
  stage: string;
  probability?: number;
  type?: 'new_business' | 'existing_business' | 'renewal';
  forecast_category?: 'pipeline' | 'best_case' | 'commit' | 'closed';
  expected_revenue?: number;
  owner_id?: string;
  lead_source?: string;
  next_step?: string;
  status?: 'open' | 'won' | 'lost';
  closed_date?: Date;
  loss_reason?: string;
  description?: string;
  tags?: string[];
  custom_fields?: any;
  created_at?: Date;
  updated_at?: Date;
  last_activity_date?: Date;
  owner_name?: string;
  account_name?: string;
  contact_name?: string;
  activity_count?: number;
  products_total?: number;
}

export interface OpportunityProduct {
  id?: string;
  opportunity_id: string;
  product_name: string;
  quantity?: number;
  unit_price?: number;
  discount?: number;
  total_price?: number;
  description?: string;
}

// Email Types
export interface CRMEmail {
  id?: string;
  workspace_id: string;
  subject?: string;
  body?: string;
  from_email?: string;
  to_emails?: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  status?: 'draft' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';
  sent_at?: Date;
  opened_at?: Date;
  open_count?: number;
  lead_id?: string;
  contact_id?: string;
  opportunity_id?: string;
  sent_by?: string;
  attachments?: any[];
  created_at?: Date;
  updated_at?: Date;
  sent_by_name?: string;
  lead_name?: string;
  contact_name?: string;
  opportunity_name?: string;
}

// Campaign Types
export interface CRMCampaign {
  id?: string;
  workspace_id: string;
  name: string;
  type?: 'email' | 'webinar' | 'conference' | 'trade_show' | 'partner' | 'advertisement' | 'direct_mail' | 'telemarketing' | 'other';
  status?: 'planned' | 'in_progress' | 'completed' | 'aborted';
  start_date?: Date;
  end_date?: Date;
  budget?: number;
  actual_cost?: number;
  expected_revenue?: number;
  expected_responses?: number;
  num_sent?: number;
  num_leads?: number;
  num_converted?: number;
  num_opportunities?: number;
  num_won?: number;
  description?: string;
  owner_id?: string;
  created_at?: Date;
  updated_at?: Date;
  owner_name?: string;
  total_members?: number;
  total_responses?: number;
  response_rate?: number;
}

// ===========================================================================
// LEADS API
// ===========================================================================

export const createLead = async (workspaceId: string, data: Partial<CRMLead>): Promise<CRMLead> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/leads`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getLeads = async (
  workspaceId: string,
  params?: {
    status?: string;
    rating?: string;
    owner_id?: string;
    source?: string;
    converted?: boolean;
  }
): Promise<CRMLead[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/leads`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getLead = async (workspaceId: string, leadId: string): Promise<CRMLead> => {
  const response = await axios.get(
    `${API_URL}/api/crm/${workspaceId}/leads/${leadId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateLead = async (
  workspaceId: string,
  leadId: string,
  data: Partial<CRMLead>
): Promise<CRMLead> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/leads/${leadId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteLead = async (workspaceId: string, leadId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/leads/${leadId}`, {
    headers: getAuthHeaders(),
  });
};

export const convertLead = async (
  workspaceId: string,
  leadId: string,
  data: {
    createAccount?: boolean;
    createOpportunity?: boolean;
    opportunityData?: any;
  }
): Promise<{ contactId: string; accountId?: string; opportunityId?: string }> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/leads/${leadId}/convert`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateLeadScore = async (workspaceId: string, leadId: string): Promise<any> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/leads/${leadId}/score`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const importLeads = async (
  workspaceId: string,
  leads: Partial<CRMLead>[]
): Promise<{ created: number; errors: any[] }> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/leads/import`,
    { leads },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

// ===========================================================================
// OPPORTUNITIES API
// ===========================================================================

export const createOpportunity = async (
  workspaceId: string,
  data: Partial<CRMOpportunity>
): Promise<CRMOpportunity> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/opportunities`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getOpportunities = async (
  workspaceId: string,
  params?: {
    stage?: string;
    status?: string;
    owner_id?: string;
    forecast_category?: string;
    close_date_from?: string;
    close_date_to?: string;
  }
): Promise<CRMOpportunity[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/opportunities`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getOpportunity = async (
  workspaceId: string,
  opportunityId: string
): Promise<CRMOpportunity> => {
  const response = await axios.get(
    `${API_URL}/api/crm/${workspaceId}/opportunities/${opportunityId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateOpportunity = async (
  workspaceId: string,
  opportunityId: string,
  data: Partial<CRMOpportunity>
): Promise<CRMOpportunity> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/opportunities/${opportunityId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteOpportunity = async (workspaceId: string, opportunityId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/opportunities/${opportunityId}`, {
    headers: getAuthHeaders(),
  });
};

export const markOpportunityWon = async (
  workspaceId: string,
  opportunityId: string
): Promise<CRMOpportunity> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/opportunities/${opportunityId}/won`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const markOpportunityLost = async (
  workspaceId: string,
  opportunityId: string,
  loss_reason: string
): Promise<CRMOpportunity> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/opportunities/${opportunityId}/lost`,
    { loss_reason },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const addOpportunityProduct = async (
  workspaceId: string,
  opportunityId: string,
  data: OpportunityProduct
): Promise<OpportunityProduct> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/opportunities/${opportunityId}/products`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const removeOpportunityProduct = async (
  workspaceId: string,
  opportunityId: string,
  productId: string
): Promise<void> => {
  await axios.delete(
    `${API_URL}/api/crm/${workspaceId}/opportunities/${opportunityId}/products/${productId}`,
    { headers: getAuthHeaders() }
  );
};

export const getOpportunityForecast = async (
  workspaceId: string,
  ownerId?: string
): Promise<any[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/forecast`, {
    params: { owner_id: ownerId },
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getOpportunityPipeline = async (
  workspaceId: string,
  ownerId?: string
): Promise<any[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/pipeline`, {
    params: { owner_id: ownerId },
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getWinLossAnalysis = async (
  workspaceId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<any[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/win-loss-analysis`, {
    params: { date_from: dateFrom, date_to: dateTo },
    headers: getAuthHeaders(),
  });
  return response.data;
};

// ===========================================================================
// EMAILS API
// ===========================================================================

export const createEmail = async (
  workspaceId: string,
  data: Partial<CRMEmail>
): Promise<CRMEmail> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/emails`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getEmails = async (
  workspaceId: string,
  params?: {
    status?: string;
    lead_id?: string;
    contact_id?: string;
    opportunity_id?: string;
    sent_by?: string;
  }
): Promise<CRMEmail[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/emails`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getEmail = async (workspaceId: string, emailId: string): Promise<CRMEmail> => {
  const response = await axios.get(
    `${API_URL}/api/crm/${workspaceId}/emails/${emailId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateEmail = async (
  workspaceId: string,
  emailId: string,
  data: Partial<CRMEmail>
): Promise<CRMEmail> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/emails/${emailId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const sendEmail = async (workspaceId: string, emailId: string): Promise<CRMEmail> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/emails/${emailId}/send`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteEmail = async (workspaceId: string, emailId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/emails/${emailId}`, {
    headers: getAuthHeaders(),
  });
};

export const getEmailStats = async (
  workspaceId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<any> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/emails/stats`, {
    params: { date_from: dateFrom, date_to: dateTo },
    headers: getAuthHeaders(),
  });
  return response.data;
};

// ===========================================================================
// CAMPAIGNS API
// ===========================================================================

export const createCampaign = async (
  workspaceId: string,
  data: Partial<CRMCampaign>
): Promise<CRMCampaign> => {
  const response = await axios.post(
    `${API_URL}/api/crm/${workspaceId}/campaigns`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getCampaigns = async (
  workspaceId: string,
  params?: {
    status?: string;
    type?: string;
    owner_id?: string;
  }
): Promise<CRMCampaign[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/campaigns`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getCampaign = async (workspaceId: string, campaignId: string): Promise<CRMCampaign> => {
  const response = await axios.get(
    `${API_URL}/api/crm/${workspaceId}/campaigns/${campaignId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateCampaign = async (
  workspaceId: string,
  campaignId: string,
  data: Partial<CRMCampaign>
): Promise<CRMCampaign> => {
  const response = await axios.put(
    `${API_URL}/api/crm/${workspaceId}/campaigns/${campaignId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteCampaign = async (workspaceId: string, campaignId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/crm/${workspaceId}/campaigns/${campaignId}`, {
    headers: getAuthHeaders(),
  });
};

export const getCampaignMetrics = async (workspaceId: string, campaignId: string): Promise<any> => {
  const response = await axios.get(
    `${API_URL}/api/crm/${workspaceId}/campaigns/${campaignId}/metrics`,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getCampaignsPerformance = async (workspaceId: string): Promise<any[]> => {
  const response = await axios.get(`${API_URL}/api/crm/${workspaceId}/campaigns/performance`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
