import { Response } from 'express';
import pool from '../database/db';
import { AuthRequest } from '../types';

// ===========================================================================
// COMPANIES
// ===========================================================================

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.user?.id;
    const {
      name,
      website,
      industry,
      size,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      notes,
      tags,
      logo_url,
      linkedin_url,
      twitter_url,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const result = await pool.query(
      `INSERT INTO crm_companies (
        workspace_id, name, website, industry, size, phone, email,
        address, city, state, country, postal_code, notes, tags,
        logo_url, linkedin_url, twitter_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        workspaceId, name, website, industry, size, phone, email,
        address, city, state, country, postal_code, notes, tags || [],
        logo_url, linkedin_url, twitter_url, userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
};

export const getCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { search, industry, size, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM crm_contacts WHERE company_id = c.id) as contact_count,
        (SELECT COUNT(*) FROM crm_deals WHERE company_id = c.id) as deal_count
      FROM crm_companies c
      WHERE c.workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (search) {
      query += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (industry) {
      query += ` AND c.industry = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }

    if (size) {
      query += ` AND c.size = $${paramIndex}`;
      params.push(size);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

export const getCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, companyId } = req.params;

    const result = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM crm_contacts WHERE company_id = c.id) as contact_count,
        (SELECT COUNT(*) FROM crm_deals WHERE company_id = c.id) as deal_count,
        (SELECT json_agg(json_build_object('id', id, 'first_name', first_name, 'last_name', last_name, 'email', email, 'job_title', job_title))
         FROM crm_contacts WHERE company_id = c.id LIMIT 10) as contacts
      FROM crm_companies c
      WHERE c.id = $1 AND c.workspace_id = $2`,
      [companyId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
};

export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, companyId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'name', 'website', 'industry', 'size', 'phone', 'email',
      'address', 'city', 'state', 'country', 'postal_code', 'notes',
      'tags', 'logo_url', 'linkedin_url', 'twitter_url'
    ];

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(companyId, workspaceId);

    const result = await pool.query(
      `UPDATE crm_companies
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
};

export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, companyId } = req.params;

    const result = await pool.query(
      'DELETE FROM crm_companies WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [companyId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
};

// ===========================================================================
// CONTACTS
// ===========================================================================

export const createContact = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.user?.id;
    const {
      company_id,
      first_name,
      last_name,
      email,
      phone,
      mobile,
      job_title,
      department,
      notes,
      tags,
      avatar_url,
      linkedin_url,
      twitter_url,
      address,
      city,
      state,
      country,
      postal_code,
      is_primary,
      lead_source,
      lead_status,
      assigned_to,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const result = await pool.query(
      `INSERT INTO crm_contacts (
        workspace_id, company_id, first_name, last_name, email, phone, mobile,
        job_title, department, notes, tags, avatar_url, linkedin_url, twitter_url,
        address, city, state, country, postal_code, is_primary, lead_source,
        lead_status, created_by, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
      [
        workspaceId, company_id, first_name, last_name, email, phone, mobile,
        job_title, department, notes, tags || [], avatar_url, linkedin_url, twitter_url,
        address, city, state, country, postal_code, is_primary || false, lead_source,
        lead_status || 'new', userId, assigned_to || userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
};

export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { search, company_id, lead_status, assigned_to, tags, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT c.*,
        co.name as company_name,
        (SELECT COUNT(*) FROM crm_deals WHERE contact_id = c.id) as deal_count
      FROM crm_contacts c
      LEFT JOIN crm_companies co ON c.company_id = co.id
      WHERE c.workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (search) {
      query += ` AND (c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (company_id) {
      query += ` AND c.company_id = $${paramIndex}`;
      params.push(company_id);
      paramIndex++;
    }

    if (lead_status) {
      query += ` AND c.lead_status = $${paramIndex}`;
      params.push(lead_status);
      paramIndex++;
    }

    if (assigned_to) {
      query += ` AND c.assigned_to = $${paramIndex}`;
      params.push(assigned_to);
      paramIndex++;
    }

    if (tags) {
      query += ` AND c.tags && $${paramIndex}`;
      params.push(Array.isArray(tags) ? tags : [tags]);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

export const getContact = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, contactId } = req.params;

    const result = await pool.query(
      `SELECT c.*,
        co.name as company_name,
        co.website as company_website,
        (SELECT COUNT(*) FROM crm_deals WHERE contact_id = c.id) as deal_count,
        (SELECT json_agg(json_build_object('id', id, 'title', title, 'value', value, 'stage', stage, 'expected_close_date', expected_close_date) ORDER BY created_at DESC)
         FROM crm_deals WHERE contact_id = c.id) as deals
      FROM crm_contacts c
      LEFT JOIN crm_companies co ON c.company_id = co.id
      WHERE c.id = $1 AND c.workspace_id = $2`,
      [contactId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
};

export const updateContact = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, contactId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'company_id', 'first_name', 'last_name', 'email', 'phone', 'mobile',
      'job_title', 'department', 'notes', 'tags', 'avatar_url', 'linkedin_url',
      'twitter_url', 'address', 'city', 'state', 'country', 'postal_code',
      'is_primary', 'lead_source', 'lead_status', 'assigned_to'
    ];

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(contactId, workspaceId);

    const result = await pool.query(
      `UPDATE crm_contacts
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
};

export const deleteContact = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, contactId } = req.params;

    const result = await pool.query(
      'DELETE FROM crm_contacts WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [contactId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
};

// ===========================================================================
// DEALS
// ===========================================================================

export const createDeal = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.user?.id;
    const {
      contact_id,
      company_id,
      title,
      description,
      value,
      currency,
      stage,
      probability,
      expected_close_date,
      tags,
      custom_fields,
      assigned_to,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Deal title is required' });
    }

    const result = await pool.query(
      `INSERT INTO crm_deals (
        workspace_id, contact_id, company_id, title, description, value, currency,
        stage, probability, expected_close_date, tags, custom_fields,
        created_by, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        workspaceId, contact_id, company_id, title, description, value || 0, currency || 'USD',
        stage || 'lead', probability || 0, expected_close_date, tags || [], custom_fields || {},
        userId, assigned_to || userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
};

export const getDeals = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { search, stage, contact_id, company_id, assigned_to, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT d.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.email as contact_email,
        co.name as company_name
      FROM crm_deals d
      LEFT JOIN crm_contacts c ON d.contact_id = c.id
      LEFT JOIN crm_companies co ON d.company_id = co.id
      WHERE d.workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (search) {
      query += ` AND d.title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (stage) {
      query += ` AND d.stage = $${paramIndex}`;
      params.push(stage);
      paramIndex++;
    }

    if (contact_id) {
      query += ` AND d.contact_id = $${paramIndex}`;
      params.push(contact_id);
      paramIndex++;
    }

    if (company_id) {
      query += ` AND d.company_id = $${paramIndex}`;
      params.push(company_id);
      paramIndex++;
    }

    if (assigned_to) {
      query += ` AND d.assigned_to = $${paramIndex}`;
      params.push(assigned_to);
      paramIndex++;
    }

    query += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
};

export const getDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, dealId } = req.params;

    const result = await pool.query(
      `SELECT d.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        c.email as contact_email,
        c.phone as contact_phone,
        co.name as company_name,
        co.website as company_website
      FROM crm_deals d
      LEFT JOIN crm_contacts c ON d.contact_id = c.id
      LEFT JOIN crm_companies co ON d.company_id = co.id
      WHERE d.id = $1 AND d.workspace_id = $2`,
      [dealId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
};

export const updateDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, dealId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'contact_id', 'company_id', 'title', 'description', 'value', 'currency',
      'stage', 'probability', 'expected_close_date', 'actual_close_date',
      'lost_reason', 'tags', 'custom_fields', 'assigned_to'
    ];

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(dealId, workspaceId);

    const result = await pool.query(
      `UPDATE crm_deals
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
};

export const deleteDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, dealId } = req.params;

    const result = await pool.query(
      'DELETE FROM crm_deals WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [dealId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
};

// ===========================================================================
// ACTIVITIES
// ===========================================================================

export const createActivity = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.user?.id;
    const {
      contact_id,
      company_id,
      deal_id,
      type,
      subject,
      description,
      duration_minutes,
      outcome,
      scheduled_at,
      completed_at,
      is_completed,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Activity type is required' });
    }

    const result = await pool.query(
      `INSERT INTO crm_activities (
        workspace_id, contact_id, company_id, deal_id, type, subject, description,
        duration_minutes, outcome, scheduled_at, completed_at, is_completed, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        workspaceId, contact_id, company_id, deal_id, type, subject, description,
        duration_minutes, outcome, scheduled_at, completed_at, is_completed || false, userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { contact_id, company_id, deal_id, type, is_completed, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT a.*,
        c.first_name as contact_first_name,
        c.last_name as contact_last_name,
        co.name as company_name,
        d.title as deal_title
      FROM crm_activities a
      LEFT JOIN crm_contacts c ON a.contact_id = c.id
      LEFT JOIN crm_companies co ON a.company_id = co.id
      LEFT JOIN crm_deals d ON a.deal_id = d.id
      WHERE a.workspace_id = $1
    `;
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (contact_id) {
      query += ` AND a.contact_id = $${paramIndex}`;
      params.push(contact_id);
      paramIndex++;
    }

    if (company_id) {
      query += ` AND a.company_id = $${paramIndex}`;
      params.push(company_id);
      paramIndex++;
    }

    if (deal_id) {
      query += ` AND a.deal_id = $${paramIndex}`;
      params.push(deal_id);
      paramIndex++;
    }

    if (type) {
      query += ` AND a.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (is_completed !== undefined) {
      query += ` AND a.is_completed = $${paramIndex}`;
      params.push(is_completed === 'true');
      paramIndex++;
    }

    query += ` ORDER BY a.scheduled_at DESC, a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

export const updateActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, activityId } = req.params;
    const updates = req.body;

    const allowedFields = [
      'subject', 'description', 'duration_minutes', 'outcome',
      'scheduled_at', 'completed_at', 'is_completed'
    ];

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(activityId, workspaceId);

    const result = await pool.query(
      `UPDATE crm_activities
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
};

export const deleteActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, activityId } = req.params;

    const result = await pool.query(
      'DELETE FROM crm_activities WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [activityId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};

// ===========================================================================
// ANALYTICS
// ===========================================================================

export const getCRMStats = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;

    const [contactStats, companyStats, dealStats] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*) as total_contacts,
          COUNT(CASE WHEN lead_status = 'new' THEN 1 END) as new_leads,
          COUNT(CASE WHEN lead_status = 'contacted' THEN 1 END) as contacted,
          COUNT(CASE WHEN lead_status = 'qualified' THEN 1 END) as qualified,
          COUNT(CASE WHEN lead_status = 'customer' THEN 1 END) as customers
        FROM crm_contacts WHERE workspace_id = $1`,
        [workspaceId]
      ),
      pool.query(
        'SELECT COUNT(*) as total_companies FROM crm_companies WHERE workspace_id = $1',
        [workspaceId]
      ),
      pool.query(
        `SELECT
          COUNT(*) as total_deals,
          SUM(CASE WHEN stage = 'closed-won' THEN value ELSE 0 END) as total_revenue,
          SUM(CASE WHEN stage NOT IN ('closed-won', 'closed-lost') THEN value ELSE 0 END) as pipeline_value,
          SUM(CASE WHEN stage NOT IN ('closed-won', 'closed-lost') THEN value * probability / 100.0 ELSE 0 END) as weighted_pipeline,
          COUNT(CASE WHEN stage = 'lead' THEN 1 END) as leads,
          COUNT(CASE WHEN stage = 'qualified' THEN 1 END) as qualified,
          COUNT(CASE WHEN stage = 'proposal' THEN 1 END) as proposals,
          COUNT(CASE WHEN stage = 'negotiation' THEN 1 END) as negotiations,
          COUNT(CASE WHEN stage = 'closed-won' THEN 1 END) as won,
          COUNT(CASE WHEN stage = 'closed-lost' THEN 1 END) as lost
        FROM crm_deals WHERE workspace_id = $1`,
        [workspaceId]
      ),
    ]);

    res.json({
      contacts: contactStats.rows[0],
      companies: companyStats.rows[0],
      deals: dealStats.rows[0],
    });
  } catch (error) {
    console.error('Error fetching CRM stats:', error);
    res.status(500).json({ error: 'Failed to fetch CRM statistics' });
  }
};
