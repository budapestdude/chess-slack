import pool from '../config/database';
import logger from '../utils/logger';

export interface Lead {
  id?: string;
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
}

class LeadService {
  // Create a new lead
  async createLead(leadData: Lead): Promise<Lead> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO crm_leads (
          workspace_id, first_name, last_name, email, phone, company, title, website,
          status, source, rating, owner_id, address, city, state, postal_code,
          country, industry, employees, revenue, description, tags, custom_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *`,
        [
          leadData.workspace_id,
          leadData.first_name,
          leadData.last_name,
          leadData.email,
          leadData.phone,
          leadData.company,
          leadData.title,
          leadData.website,
          leadData.status || 'new',
          leadData.source,
          leadData.rating,
          leadData.owner_id,
          leadData.address,
          leadData.city,
          leadData.state,
          leadData.postal_code,
          leadData.country,
          leadData.industry,
          leadData.employees,
          leadData.revenue,
          leadData.description,
          leadData.tags || [],
          JSON.stringify(leadData.custom_fields || {}),
        ]
      );

      // Calculate initial lead score
      const lead = result.rows[0];
      await this.updateLeadScore(client, lead.id);

      await client.query('COMMIT');
      logger.info('Lead created', { leadId: lead.id });
      return lead;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating lead', { error, leadData });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all leads with filtering
  async getLeads(workspaceId: string, filters: any = {}): Promise<Lead[]> {
    const conditions = ['workspace_id = $1'];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.rating) {
      conditions.push(`rating = $${paramIndex}`);
      params.push(filters.rating);
      paramIndex++;
    }

    if (filters.owner_id) {
      conditions.push(`owner_id = $${paramIndex}`);
      params.push(filters.owner_id);
      paramIndex++;
    }

    if (filters.source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(filters.source);
      paramIndex++;
    }

    if (filters.converted !== undefined) {
      conditions.push(`converted = $${paramIndex}`);
      params.push(filters.converted);
      paramIndex++;
    }

    const query = `
      SELECT l.*,
             u.username as owner_name,
             (SELECT COUNT(*) FROM crm_activities WHERE lead_id = l.id) as activity_count
      FROM crm_leads l
      LEFT JOIN users u ON l.owner_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY l.lead_score DESC, l.created_at DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get a single lead
  async getLead(leadId: string): Promise<Lead | null> {
    const result = await pool.query(
      `SELECT l.*,
              u.username as owner_name,
              (SELECT COUNT(*) FROM crm_activities WHERE lead_id = l.id) as activity_count,
              (SELECT json_agg(a.* ORDER BY a.created_at DESC) FROM crm_activities a WHERE a.lead_id = l.id) as activities
       FROM crm_leads l
       LEFT JOIN users u ON l.owner_id = u.id
       WHERE l.id = $1`,
      [leadId]
    );

    return result.rows[0] || null;
  }

  // Update a lead
  async updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'company', 'title', 'website',
      'status', 'source', 'rating', 'owner_id', 'address', 'city', 'state',
      'postal_code', 'country', 'industry', 'employees', 'revenue', 'description',
      'tags', 'custom_fields'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(key === 'custom_fields' || key === 'tags' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(leadId);

    const result = await pool.query(
      `UPDATE crm_leads
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }

    // Recalculate lead score
    await this.updateLeadScore(null, leadId);

    logger.info('Lead updated', { leadId, updates });
    return result.rows[0];
  }

  // Delete a lead
  async deleteLead(leadId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM crm_leads WHERE id = $1 RETURNING id',
      [leadId]
    );

    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }

    logger.info('Lead deleted', { leadId });
  }

  // Convert lead to contact/account/opportunity
  async convertLead(
    leadId: string,
    createAccount: boolean,
    createOpportunity: boolean,
    opportunityData?: any
  ): Promise<{ contactId: string; accountId?: string; opportunityId?: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get lead data
      const leadResult = await client.query('SELECT * FROM crm_leads WHERE id = $1', [leadId]);
      if (leadResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const lead = leadResult.rows[0];

      // Create account if requested
      let accountId;
      if (createAccount && lead.company) {
        const accountResult = await client.query(
          `INSERT INTO crm_companies (workspace_id, name, website, industry, phone, tags)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [lead.workspace_id, lead.company, lead.website, lead.industry, lead.phone, lead.tags || []]
        );
        accountId = accountResult.rows[0].id;
      }

      // Create contact
      const contactResult = await client.query(
        `INSERT INTO crm_contacts (
          workspace_id, company_id, first_name, last_name, email, phone, title,
          lead_source, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          lead.workspace_id,
          accountId,
          lead.first_name,
          lead.last_name,
          lead.email,
          lead.phone,
          lead.title,
          lead.source,
          lead.tags || []
        ]
      );
      const contactId = contactResult.rows[0].id;

      // Create opportunity if requested
      let opportunityId;
      if (createOpportunity && opportunityData) {
        const oppResult = await client.query(
          `INSERT INTO crm_opportunities (
            workspace_id, name, account_id, contact_id, amount, close_date,
            stage, probability, owner_id, lead_source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            lead.workspace_id,
            opportunityData.name || `${lead.company} - Opportunity`,
            accountId,
            contactId,
            opportunityData.amount,
            opportunityData.close_date,
            opportunityData.stage || 'Qualification',
            opportunityData.probability || 10,
            lead.owner_id,
            lead.source
          ]
        );
        opportunityId = oppResult.rows[0].id;
      }

      // Update lead as converted
      await client.query(
        `UPDATE crm_leads
         SET converted = TRUE,
             converted_date = CURRENT_TIMESTAMP,
             converted_contact_id = $2,
             converted_account_id = $3,
             converted_opportunity_id = $4,
             status = 'converted'
         WHERE id = $1`,
        [leadId, contactId, accountId, opportunityId]
      );

      // Transfer activities to contact
      await client.query(
        `UPDATE crm_activities
         SET contact_id = $2, lead_id = NULL
         WHERE lead_id = $1`,
        [leadId, contactId]
      );

      await client.query('COMMIT');

      logger.info('Lead converted', { leadId, contactId, accountId, opportunityId });

      return { contactId, accountId, opportunityId };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error converting lead', { error, leadId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Calculate and update lead score
  async updateLeadScore(client: any, leadId: string): Promise<number> {
    const useClient = client || await pool.connect();
    try {
      const result = await useClient.query('SELECT * FROM crm_leads WHERE id = $1', [leadId]);
      if (result.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const lead = result.rows[0];
      let score = 0;
      const factors: any = {};

      // Demographic scoring
      if (lead.title) {
        if (lead.title.toLowerCase().includes('ceo') || lead.title.toLowerCase().includes('president')) {
          score += 20;
          factors.title = 20;
        } else if (lead.title.toLowerCase().includes('vp') || lead.title.toLowerCase().includes('director')) {
          score += 15;
          factors.title = 15;
        } else if (lead.title.toLowerCase().includes('manager')) {
          score += 10;
          factors.title = 10;
        }
      }

      if (lead.employees) {
        if (lead.employees > 1000) {
          score += 15;
          factors.company_size = 15;
        } else if (lead.employees > 100) {
          score += 10;
          factors.company_size = 10;
        } else if (lead.employees > 10) {
          score += 5;
          factors.company_size = 5;
        }
      }

      if (lead.revenue) {
        if (lead.revenue > 10000000) {
          score += 15;
          factors.revenue = 15;
        } else if (lead.revenue > 1000000) {
          score += 10;
          factors.revenue = 10;
        }
      }

      // Behavioral scoring - check activity
      const activityResult = await useClient.query(
        'SELECT COUNT(*) as count FROM crm_activities WHERE lead_id = $1',
        [leadId]
      );
      const activityCount = parseInt(activityResult.rows[0].count);
      if (activityCount > 10) {
        score += 20;
        factors.engagement = 20;
      } else if (activityCount > 5) {
        score += 10;
        factors.engagement = 10;
      } else if (activityCount > 0) {
        score += 5;
        factors.engagement = 5;
      }

      // Contact info completeness
      let completeness = 0;
      if (lead.email) completeness += 5;
      if (lead.phone) completeness += 5;
      if (lead.company) completeness += 5;
      if (lead.website) completeness += 5;
      score += completeness;
      if (completeness > 0) {
        factors.data_completeness = completeness;
      }

      // Update the lead
      await useClient.query(
        `UPDATE crm_leads
         SET lead_score = $1, score_factors = $2
         WHERE id = $3`,
        [score, JSON.stringify(factors), leadId]
      );

      return score;
    } finally {
      if (!client) {
        useClient.release();
      }
    }
  }

  // Bulk import leads
  async importLeads(workspaceId: string, leads: Partial<Lead>[]): Promise<{ created: number; errors: any[] }> {
    let created = 0;
    const errors: any[] = [];

    for (const lead of leads) {
      try {
        await this.createLead({ ...lead, workspace_id: workspaceId } as Lead);
        created++;
      } catch (error) {
        errors.push({ lead, error: (error as Error).message });
      }
    }

    logger.info('Bulk lead import completed', { workspaceId, created, errorCount: errors.length });

    return { created, errors };
  }
}

export default new LeadService();
