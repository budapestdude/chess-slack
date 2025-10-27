import pool from '../database/db';
import logger from '../utils/logger';

export interface Campaign {
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
}

export interface CampaignMember {
  id?: string;
  campaign_id: string;
  lead_id?: string;
  contact_id?: string;
  status?: string;
  responded?: boolean;
  response_date?: Date;
  created_at?: Date;
}

class CampaignService {
  // Create a new campaign
  async createCampaign(campaignData: Campaign): Promise<Campaign> {
    const result = await pool.query(
      `INSERT INTO crm_campaigns (
        workspace_id, name, type, status, start_date, end_date, budget,
        expected_revenue, expected_responses, description, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        campaignData.workspace_id,
        campaignData.name,
        campaignData.type,
        campaignData.status || 'planned',
        campaignData.start_date,
        campaignData.end_date,
        campaignData.budget,
        campaignData.expected_revenue,
        campaignData.expected_responses,
        campaignData.description,
        campaignData.owner_id,
      ]
    );

    logger.info('Campaign created', { campaignId: result.rows[0].id });
    return result.rows[0];
  }

  // Get all campaigns with filtering
  async getCampaigns(workspaceId: string, filters: any = {}): Promise<Campaign[]> {
    const conditions = ['workspace_id = $1'];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.owner_id) {
      conditions.push(`owner_id = $${paramIndex}`);
      params.push(filters.owner_id);
      paramIndex++;
    }

    const query = `
      SELECT c.*,
             u.username as owner_name,
             (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id) as total_members,
             (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id AND responded = true) as total_responses
      FROM crm_campaigns c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.start_date DESC, c.created_at DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get a single campaign with details
  async getCampaign(campaignId: string): Promise<any> {
    const result = await pool.query(
      `SELECT c.*,
              u.username as owner_name,
              u.email as owner_email,
              (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id) as total_members,
              (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id AND responded = true) as total_responses,
              (SELECT json_agg(cm.*) FROM crm_campaign_members cm WHERE cm.campaign_id = c.id) as members
       FROM crm_campaigns c
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE c.id = $1`,
      [campaignId]
    );

    return result.rows[0] || null;
  }

  // Update a campaign
  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'type', 'status', 'start_date', 'end_date', 'budget',
      'actual_cost', 'expected_revenue', 'expected_responses', 'description', 'owner_id'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(campaignId);

    const result = await pool.query(
      `UPDATE crm_campaigns
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Campaign not found');
    }

    logger.info('Campaign updated', { campaignId, updates });
    return result.rows[0];
  }

  // Delete a campaign
  async deleteCampaign(campaignId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM crm_campaigns WHERE id = $1 RETURNING id',
      [campaignId]
    );

    if (result.rows.length === 0) {
      throw new Error('Campaign not found');
    }

    logger.info('Campaign deleted', { campaignId });
  }

  // Add member to campaign
  async addMember(memberData: CampaignMember): Promise<CampaignMember> {
    const result = await pool.query(
      `INSERT INTO crm_campaign_members (
        campaign_id, lead_id, contact_id, status, responded
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        memberData.campaign_id,
        memberData.lead_id,
        memberData.contact_id,
        memberData.status || 'sent',
        memberData.responded || false,
      ]
    );

    // Update campaign num_sent
    await pool.query(
      `UPDATE crm_campaigns
       SET num_sent = num_sent + 1
       WHERE id = $1`,
      [memberData.campaign_id]
    );

    logger.info('Campaign member added', {
      campaignId: memberData.campaign_id,
      memberId: result.rows[0].id
    });

    return result.rows[0];
  }

  // Bulk add members to campaign
  async addMembers(campaignId: string, members: CampaignMember[]): Promise<{ added: number; errors: any[] }> {
    let added = 0;
    const errors: any[] = [];

    for (const member of members) {
      try {
        await this.addMember({ ...member, campaign_id: campaignId });
        added++;
      } catch (error) {
        errors.push({ member, error: (error as Error).message });
      }
    }

    logger.info('Bulk campaign members added', { campaignId, added, errorCount: errors.length });
    return { added, errors };
  }

  // Remove member from campaign
  async removeMember(memberId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM crm_campaign_members WHERE id = $1 RETURNING campaign_id',
      [memberId]
    );

    if (result.rows.length === 0) {
      throw new Error('Campaign member not found');
    }

    // Update campaign num_sent
    await pool.query(
      `UPDATE crm_campaigns
       SET num_sent = GREATEST(num_sent - 1, 0)
       WHERE id = $1`,
      [result.rows[0].campaign_id]
    );

    logger.info('Campaign member removed', { memberId });
  }

  // Mark member as responded
  async markMemberResponded(memberId: string): Promise<CampaignMember> {
    const result = await pool.query(
      `UPDATE crm_campaign_members
       SET responded = true,
           response_date = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [memberId]
    );

    if (result.rows.length === 0) {
      throw new Error('Campaign member not found');
    }

    logger.info('Campaign member marked as responded', { memberId });
    return result.rows[0];
  }

  // Get campaign members
  async getCampaignMembers(campaignId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT cm.*,
              l.first_name || ' ' || l.last_name as lead_name,
              l.email as lead_email,
              c.first_name || ' ' || c.last_name as contact_name,
              c.email as contact_email
       FROM crm_campaign_members cm
       LEFT JOIN crm_leads l ON cm.lead_id = l.id
       LEFT JOIN crm_contacts c ON cm.contact_id = c.id
       WHERE cm.campaign_id = $1
       ORDER BY cm.created_at DESC`,
      [campaignId]
    );

    return result.rows;
  }

  // Get campaign ROI and metrics
  async getCampaignMetrics(campaignId: string): Promise<any> {
    const result = await pool.query(
      `SELECT
        c.*,
        (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id) as total_members,
        (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id AND responded = true) as total_responses,
        ROUND(
          (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id AND responded = true)::DECIMAL /
          NULLIF((SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id), 0) * 100,
          2
        ) as response_rate,
        ROUND(
          CASE WHEN c.actual_cost > 0
          THEN ((SELECT COALESCE(SUM(amount), 0) FROM crm_opportunities WHERE lead_source = c.name AND status = 'won') - c.actual_cost) / c.actual_cost * 100
          ELSE 0
          END,
          2
        ) as roi,
        (SELECT COALESCE(SUM(amount), 0) FROM crm_opportunities WHERE lead_source = c.name) as total_opportunity_value,
        (SELECT COALESCE(SUM(amount), 0) FROM crm_opportunities WHERE lead_source = c.name AND status = 'won') as total_won_value
      FROM crm_campaigns c
      WHERE c.id = $1`,
      [campaignId]
    );

    return result.rows[0] || null;
  }

  // Get all campaigns performance summary
  async getCampaignsPerformance(workspaceId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        c.id,
        c.name,
        c.type,
        c.status,
        c.budget,
        c.actual_cost,
        c.num_sent,
        c.num_leads,
        c.num_converted,
        c.num_opportunities,
        c.num_won,
        (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id) as total_members,
        (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id AND responded = true) as total_responses,
        ROUND(
          (SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id AND responded = true)::DECIMAL /
          NULLIF((SELECT COUNT(*) FROM crm_campaign_members WHERE campaign_id = c.id), 0) * 100,
          2
        ) as response_rate,
        (SELECT COALESCE(SUM(amount), 0) FROM crm_opportunities WHERE lead_source = c.name AND status = 'won') as total_won_value
      FROM crm_campaigns c
      WHERE c.workspace_id = $1
      ORDER BY c.start_date DESC`,
      [workspaceId]
    );

    return result.rows;
  }
}

export default new CampaignService();
