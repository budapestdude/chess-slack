import pool from '../config/database';
import logger from '../utils/logger';

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
}

class EmailService {
  // Create a new email (draft or send)
  async createEmail(emailData: CRMEmail): Promise<CRMEmail> {
    const result = await pool.query(
      `INSERT INTO crm_emails (
        workspace_id, subject, body, from_email, to_emails, cc_emails, bcc_emails,
        status, lead_id, contact_id, opportunity_id, sent_by, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        emailData.workspace_id,
        emailData.subject,
        emailData.body,
        emailData.from_email,
        emailData.to_emails || [],
        emailData.cc_emails || [],
        emailData.bcc_emails || [],
        emailData.status || 'draft',
        emailData.lead_id,
        emailData.contact_id,
        emailData.opportunity_id,
        emailData.sent_by,
        JSON.stringify(emailData.attachments || []),
      ]
    );

    logger.info('Email created', { emailId: result.rows[0].id, status: result.rows[0].status });
    return result.rows[0];
  }

  // Get all emails with filtering
  async getEmails(workspaceId: string, filters: any = {}): Promise<CRMEmail[]> {
    const conditions = ['workspace_id = $1'];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.lead_id) {
      conditions.push(`lead_id = $${paramIndex}`);
      params.push(filters.lead_id);
      paramIndex++;
    }

    if (filters.contact_id) {
      conditions.push(`contact_id = $${paramIndex}`);
      params.push(filters.contact_id);
      paramIndex++;
    }

    if (filters.opportunity_id) {
      conditions.push(`opportunity_id = $${paramIndex}`);
      params.push(filters.opportunity_id);
      paramIndex++;
    }

    if (filters.sent_by) {
      conditions.push(`sent_by = $${paramIndex}`);
      params.push(filters.sent_by);
      paramIndex++;
    }

    const query = `
      SELECT e.*,
             u.username as sent_by_name,
             u.email as sent_by_email,
             l.first_name || ' ' || l.last_name as lead_name,
             c.first_name || ' ' || c.last_name as contact_name,
             o.name as opportunity_name
      FROM crm_emails e
      LEFT JOIN users u ON e.sent_by = u.id
      LEFT JOIN crm_leads l ON e.lead_id = l.id
      LEFT JOIN crm_contacts c ON e.contact_id = c.id
      LEFT JOIN crm_opportunities o ON e.opportunity_id = o.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.created_at DESC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get a single email
  async getEmail(emailId: string): Promise<CRMEmail | null> {
    const result = await pool.query(
      `SELECT e.*,
              u.username as sent_by_name,
              u.email as sent_by_email,
              l.first_name || ' ' || l.last_name as lead_name,
              c.first_name || ' ' || c.last_name as contact_name,
              o.name as opportunity_name
       FROM crm_emails e
       LEFT JOIN users u ON e.sent_by = u.id
       LEFT JOIN crm_leads l ON e.lead_id = l.id
       LEFT JOIN crm_contacts c ON e.contact_id = c.id
       LEFT JOIN crm_opportunities o ON e.opportunity_id = o.id
       WHERE e.id = $1`,
      [emailId]
    );

    return result.rows[0] || null;
  }

  // Update an email (for drafts)
  async updateEmail(emailId: string, updates: Partial<CRMEmail>): Promise<CRMEmail> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'subject', 'body', 'from_email', 'to_emails', 'cc_emails', 'bcc_emails',
      'lead_id', 'contact_id', 'opportunity_id', 'attachments'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        if (key === 'attachments' || key.includes('emails')) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(emailId);

    const result = await pool.query(
      `UPDATE crm_emails
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND status = 'draft'
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Email not found or cannot be updated (only drafts can be edited)');
    }

    logger.info('Email updated', { emailId });
    return result.rows[0];
  }

  // Send an email (update status and timestamp)
  async sendEmail(emailId: string): Promise<CRMEmail> {
    const result = await pool.query(
      `UPDATE crm_emails
       SET status = 'sent',
           sent_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [emailId]
    );

    if (result.rows.length === 0) {
      throw new Error('Email not found or already sent');
    }

    logger.info('Email sent', { emailId });

    // In a real implementation, this would integrate with an email service provider
    // (SendGrid, Mailgun, AWS SES, etc.) to actually send the email

    return result.rows[0];
  }

  // Track email open
  async trackEmailOpen(emailId: string): Promise<void> {
    await pool.query(
      `UPDATE crm_emails
       SET status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END,
           opened_at = CASE WHEN opened_at IS NULL THEN CURRENT_TIMESTAMP ELSE opened_at END,
           open_count = open_count + 1
       WHERE id = $1`,
      [emailId]
    );

    logger.info('Email opened', { emailId });
  }

  // Mark email as delivered
  async markDelivered(emailId: string): Promise<void> {
    await pool.query(
      `UPDATE crm_emails
       SET status = 'delivered'
       WHERE id = $1 AND status = 'sent'`,
      [emailId]
    );

    logger.info('Email delivered', { emailId });
  }

  // Mark email as bounced
  async markBounced(emailId: string): Promise<void> {
    await pool.query(
      `UPDATE crm_emails
       SET status = 'bounced'
       WHERE id = $1`,
      [emailId]
    );

    logger.warn('Email bounced', { emailId });
  }

  // Mark email as failed
  async markFailed(emailId: string): Promise<void> {
    await pool.query(
      `UPDATE crm_emails
       SET status = 'failed'
       WHERE id = $1`,
      [emailId]
    );

    logger.error('Email failed', { emailId });
  }

  // Delete an email
  async deleteEmail(emailId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM crm_emails WHERE id = $1 RETURNING id',
      [emailId]
    );

    if (result.rows.length === 0) {
      throw new Error('Email not found');
    }

    logger.info('Email deleted', { emailId });
  }

  // Get email statistics for a workspace
  async getEmailStats(workspaceId: string, dateFrom?: Date, dateTo?: Date): Promise<any> {
    const conditions = ['workspace_id = $1'];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (dateFrom) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_emails,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        COUNT(*) FILTER (WHERE status = 'opened') as opened_count,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'opened')::DECIMAL /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened')), 0) * 100,
          2
        ) as open_rate,
        SUM(open_count) as total_opens
      FROM crm_emails
      WHERE ${conditions.join(' AND ')}`,
      params
    );

    return result.rows[0];
  }

  // Get emails by relationship (lead, contact, or opportunity)
  async getEmailsByRelationship(
    relationshipType: 'lead' | 'contact' | 'opportunity',
    relationshipId: string
  ): Promise<CRMEmail[]> {
    const columnMap = {
      lead: 'lead_id',
      contact: 'contact_id',
      opportunity: 'opportunity_id',
    };

    const column = columnMap[relationshipType];

    const result = await pool.query(
      `SELECT e.*,
              u.username as sent_by_name,
              u.email as sent_by_email
       FROM crm_emails e
       LEFT JOIN users u ON e.sent_by = u.id
       WHERE e.${column} = $1
       ORDER BY e.created_at DESC`,
      [relationshipId]
    );

    return result.rows;
  }
}

export default new EmailService();
