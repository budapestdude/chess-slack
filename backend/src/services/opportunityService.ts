import pool from '../config/database';
import logger from '../utils/logger';

export interface Opportunity {
  id?: string;
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

class OpportunityService {
  // Create a new opportunity
  async createOpportunity(oppData: Opportunity): Promise<Opportunity> {
    const result = await pool.query(
      `INSERT INTO crm_opportunities (
        workspace_id, name, account_id, contact_id, amount, close_date,
        stage, probability, type, forecast_category, owner_id, lead_source,
        next_step, description, tags, custom_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        oppData.workspace_id,
        oppData.name,
        oppData.account_id,
        oppData.contact_id,
        oppData.amount,
        oppData.close_date,
        oppData.stage,
        oppData.probability || 10,
        oppData.type,
        oppData.forecast_category || 'pipeline',
        oppData.owner_id,
        oppData.lead_source,
        oppData.next_step,
        oppData.description,
        oppData.tags || [],
        JSON.stringify(oppData.custom_fields || {}),
      ]
    );

    logger.info('Opportunity created', { opportunityId: result.rows[0].id });
    return result.rows[0];
  }

  // Get all opportunities with filtering
  async getOpportunities(workspaceId: string, filters: any = {}): Promise<Opportunity[]> {
    const conditions = ['o.workspace_id = $1'];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (filters.stage) {
      conditions.push(`o.stage = $${paramIndex}`);
      params.push(filters.stage);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`o.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.owner_id) {
      conditions.push(`o.owner_id = $${paramIndex}`);
      params.push(filters.owner_id);
      paramIndex++;
    }

    if (filters.forecast_category) {
      conditions.push(`o.forecast_category = $${paramIndex}`);
      params.push(filters.forecast_category);
      paramIndex++;
    }

    if (filters.close_date_from) {
      conditions.push(`o.close_date >= $${paramIndex}`);
      params.push(filters.close_date_from);
      paramIndex++;
    }

    if (filters.close_date_to) {
      conditions.push(`o.close_date <= $${paramIndex}`);
      params.push(filters.close_date_to);
      paramIndex++;
    }

    const query = `
      SELECT o.*,
             u.username as owner_name,
             c.name as account_name,
             con.first_name || ' ' || con.last_name as contact_name,
             (SELECT COUNT(*) FROM crm_activities WHERE opportunity_id = o.id) as activity_count,
             (SELECT SUM(total_price) FROM crm_opportunity_products WHERE opportunity_id = o.id) as products_total
      FROM crm_opportunities o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN crm_companies c ON o.account_id = c.id
      LEFT JOIN crm_contacts con ON o.contact_id = con.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.close_date ASC, o.amount DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get a single opportunity with details
  async getOpportunity(opportunityId: string): Promise<any> {
    const result = await pool.query(
      `SELECT o.*,
              u.username as owner_name,
              u.email as owner_email,
              c.name as account_name,
              c.id as account_id,
              con.first_name || ' ' || con.last_name as contact_name,
              con.id as contact_id,
              con.email as contact_email,
              (SELECT json_agg(p.* ORDER BY p.created_at) FROM crm_opportunity_products p WHERE p.opportunity_id = o.id) as products,
              (SELECT json_agg(a.* ORDER BY a.created_at DESC) FROM crm_activities a WHERE a.opportunity_id = o.id) as activities
       FROM crm_opportunities o
       LEFT JOIN users u ON o.owner_id = u.id
       LEFT JOIN crm_companies c ON o.account_id = c.id
       LEFT JOIN crm_contacts con ON o.contact_id = con.id
       WHERE o.id = $1`,
      [opportunityId]
    );

    return result.rows[0] || null;
  }

  // Update an opportunity
  async updateOpportunity(opportunityId: string, updates: Partial<Opportunity>): Promise<Opportunity> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'account_id', 'contact_id', 'amount', 'close_date', 'stage',
      'probability', 'type', 'forecast_category', 'owner_id', 'lead_source',
      'next_step', 'status', 'closed_date', 'loss_reason', 'description',
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

    values.push(opportunityId);

    const result = await pool.query(
      `UPDATE crm_opportunities
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Opportunity not found');
    }

    logger.info('Opportunity updated', { opportunityId, updates });
    return result.rows[0];
  }

  // Delete an opportunity
  async deleteOpportunity(opportunityId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM crm_opportunities WHERE id = $1 RETURNING id',
      [opportunityId]
    );

    if (result.rows.length === 0) {
      throw new Error('Opportunity not found');
    }

    logger.info('Opportunity deleted', { opportunityId });
  }

  // Mark opportunity as won
  async markWon(opportunityId: string): Promise<Opportunity> {
    const result = await pool.query(
      `UPDATE crm_opportunities
       SET status = 'won',
           closed_date = CURRENT_TIMESTAMP,
           forecast_category = 'closed',
           probability = 100
       WHERE id = $1
       RETURNING *`,
      [opportunityId]
    );

    if (result.rows.length === 0) {
      throw new Error('Opportunity not found');
    }

    logger.info('Opportunity marked as won', { opportunityId });
    return result.rows[0];
  }

  // Mark opportunity as lost
  async markLost(opportunityId: string, lossReason: string): Promise<Opportunity> {
    const result = await pool.query(
      `UPDATE crm_opportunities
       SET status = 'lost',
           closed_date = CURRENT_TIMESTAMP,
           forecast_category = 'closed',
           probability = 0,
           loss_reason = $2
       WHERE id = $1
       RETURNING *`,
      [opportunityId, lossReason]
    );

    if (result.rows.length === 0) {
      throw new Error('Opportunity not found');
    }

    logger.info('Opportunity marked as lost', { opportunityId, lossReason });
    return result.rows[0];
  }

  // Add product to opportunity
  async addProduct(productData: OpportunityProduct): Promise<OpportunityProduct> {
    const totalPrice = (productData.unit_price || 0) * (productData.quantity || 1) * (1 - (productData.discount || 0) / 100);

    const result = await pool.query(
      `INSERT INTO crm_opportunity_products (
        opportunity_id, product_name, quantity, unit_price, discount, total_price, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        productData.opportunity_id,
        productData.product_name,
        productData.quantity || 1,
        productData.unit_price,
        productData.discount || 0,
        totalPrice,
        productData.description,
      ]
    );

    logger.info('Product added to opportunity', {
      opportunityId: productData.opportunity_id,
      productId: result.rows[0].id
    });

    return result.rows[0];
  }

  // Remove product from opportunity
  async removeProduct(productId: string): Promise<void> {
    await pool.query('DELETE FROM crm_opportunity_products WHERE id = $1', [productId]);
    logger.info('Product removed from opportunity', { productId });
  }

  // Get forecast by category
  async getForecast(workspaceId: string, ownerId?: string): Promise<any> {
    const conditions = ['workspace_id = $1', 'status = $2'];
    const params: any[] = [workspaceId, 'open'];

    if (ownerId) {
      conditions.push('owner_id = $3');
      params.push(ownerId);
    }

    const result = await pool.query(
      `SELECT
        forecast_category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(expected_revenue) as total_expected_revenue,
        AVG(probability) as avg_probability
      FROM crm_opportunities
      WHERE ${conditions.join(' AND ')}
      GROUP BY forecast_category
      ORDER BY
        CASE forecast_category
          WHEN 'closed' THEN 1
          WHEN 'commit' THEN 2
          WHEN 'best_case' THEN 3
          WHEN 'pipeline' THEN 4
        END`,
      params
    );

    return result.rows;
  }

  // Get pipeline metrics
  async getPipelineMetrics(workspaceId: string, ownerId?: string): Promise<any> {
    const conditions = ['workspace_id = $1'];
    const params: any[] = [workspaceId];

    if (ownerId) {
      conditions.push('owner_id = $2');
      params.push(ownerId);
    }

    const result = await pool.query(
      `SELECT
        stage,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(probability) as avg_probability,
        SUM(expected_revenue) as total_expected_revenue
      FROM crm_opportunities
      WHERE ${conditions.join(' AND ')} AND status = 'open'
      GROUP BY stage
      ORDER BY AVG(probability) DESC`,
      params
    );

    return result.rows;
  }

  // Get win/loss analysis
  async getWinLossAnalysis(workspaceId: string, dateFrom?: Date, dateTo?: Date): Promise<any> {
    const conditions = ['workspace_id = $1', "status IN ('won', 'lost')"];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (dateFrom) {
      conditions.push(`closed_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`closed_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        json_agg(DISTINCT loss_reason) FILTER (WHERE loss_reason IS NOT NULL) as loss_reasons
      FROM crm_opportunities
      WHERE ${conditions.join(' AND ')}
      GROUP BY status`,
      params
    );

    return result.rows;
  }
}

export default new OpportunityService();
