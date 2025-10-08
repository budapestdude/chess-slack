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
