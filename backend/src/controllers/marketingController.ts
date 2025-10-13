import { Response } from 'express';
import { z } from 'zod';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { BadRequestError, NotFoundError } from '../errors';

// ============ SPONSORS ============

const createSponsorSchema = z.object({
  name: z.string().min(1).max(255),
  tier: z.enum(['gold', 'silver', 'bronze', 'custom']).default('bronze'),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  contributionAmount: z.number().optional(),
  benefits: z.string().optional(),
  notes: z.string().optional(),
});

export const getSponsors = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;

  const result = await pool.query(
    `SELECT s.*, u.username as created_by_username
     FROM sponsors s
     JOIN users u ON s.created_by = u.id
     WHERE s.workspace_id = $1
     ORDER BY
       CASE s.tier
         WHEN 'gold' THEN 1
         WHEN 'silver' THEN 2
         WHEN 'bronze' THEN 3
         ELSE 4
       END,
       s.created_at DESC`,
    [workspaceId]
  );

  res.json({ sponsors: result.rows });
};

export const createSponsor = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const data = createSponsorSchema.parse(req.body);

  const result = await pool.query(
    `INSERT INTO sponsors (
      workspace_id, name, tier, logo_url, website_url,
      contact_name, contact_email, contact_phone,
      contribution_amount, benefits, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      workspaceId,
      data.name,
      data.tier,
      data.logoUrl || null,
      data.websiteUrl || null,
      data.contactName || null,
      data.contactEmail || null,
      data.contactPhone || null,
      data.contributionAmount || null,
      data.benefits || null,
      data.notes || null,
      userId,
    ]
  );

  res.status(201).json(result.rows[0]);
};

export const updateSponsor = async (req: AuthRequest, res: Response) => {
  const { workspaceId, sponsorId } = req.params;
  const data = createSponsorSchema.partial().parse(req.body);

  const updateFields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateFields.push(`${dbKey} = $${paramCount++}`);
      values.push(value);
    }
  });

  if (updateFields.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  values.push(sponsorId, workspaceId);

  const result = await pool.query(
    `UPDATE sponsors
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount++} AND workspace_id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Sponsor not found');
  }

  res.json(result.rows[0]);
};

export const deleteSponsor = async (req: AuthRequest, res: Response) => {
  const { workspaceId, sponsorId } = req.params;

  const result = await pool.query(
    'DELETE FROM sponsors WHERE id = $1 AND workspace_id = $2 RETURNING id',
    [sponsorId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Sponsor not found');
  }

  res.json({ message: 'Sponsor deleted successfully' });
};

// ============ EMAIL CAMPAIGNS ============

const createEmailCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  scheduledAt: z.string().datetime().optional(),
});

export const getEmailCampaigns = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  const result = await pool.query(
    `SELECT ec.*, u.username as created_by_username
     FROM email_campaigns ec
     JOIN users u ON ec.created_by = u.id
     WHERE ec.workspace_id = $1
     ORDER BY ec.created_at DESC`,
    [workspaceId]
  );

  res.json({ campaigns: result.rows });
};

export const createEmailCampaign = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const data = createEmailCampaignSchema.parse(req.body);

  const result = await pool.query(
    `INSERT INTO email_campaigns (
      workspace_id, name, subject, body, scheduled_at, created_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      workspaceId,
      data.name,
      data.subject,
      data.body,
      data.scheduledAt || null,
      userId,
      data.scheduledAt ? 'scheduled' : 'draft',
    ]
  );

  res.status(201).json(result.rows[0]);
};

export const deleteEmailCampaign = async (req: AuthRequest, res: Response) => {
  const { workspaceId, campaignId } = req.params;

  const result = await pool.query(
    'DELETE FROM email_campaigns WHERE id = $1 AND workspace_id = $2 RETURNING id',
    [campaignId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  res.json({ message: 'Campaign deleted successfully' });
};

// ============ SOCIAL MEDIA POSTS ============

const createSocialMediaPostSchema = z.object({
  platform: z.enum(['twitter', 'facebook', 'instagram', 'linkedin']),
  content: z.string().min(1),
  mediaUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const getSocialMediaPosts = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  const result = await pool.query(
    `SELECT smp.*, u.username as created_by_username
     FROM social_media_posts smp
     JOIN users u ON smp.created_by = u.id
     WHERE smp.workspace_id = $1
     ORDER BY smp.created_at DESC`,
    [workspaceId]
  );

  res.json({ posts: result.rows });
};

export const createSocialMediaPost = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const data = createSocialMediaPostSchema.parse(req.body);

  const result = await pool.query(
    `INSERT INTO social_media_posts (
      workspace_id, platform, content, media_url, scheduled_at, created_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      workspaceId,
      data.platform,
      data.content,
      data.mediaUrl || null,
      data.scheduledAt || null,
      userId,
      data.scheduledAt ? 'scheduled' : 'draft',
    ]
  );

  res.status(201).json(result.rows[0]);
};

export const deleteSocialMediaPost = async (req: AuthRequest, res: Response) => {
  const { workspaceId, postId } = req.params;

  const result = await pool.query(
    'DELETE FROM social_media_posts WHERE id = $1 AND workspace_id = $2 RETURNING id',
    [postId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Post not found');
  }

  res.json({ message: 'Post deleted successfully' });
};

// ============ POSTER TEMPLATES ============

const createPosterTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  templateType: z.enum(['poster', 'banner', 'social_media']),
  designData: z.object({}).passthrough(), // Allow any design data structure
});

export const getPosterTemplates = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  const result = await pool.query(
    `SELECT pt.*, u.username as created_by_username
     FROM poster_templates pt
     JOIN users u ON pt.created_by = u.id
     WHERE pt.workspace_id = $1
     ORDER BY pt.created_at DESC`,
    [workspaceId]
  );

  res.json({ templates: result.rows });
};

export const createPosterTemplate = async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const data = createPosterTemplateSchema.parse(req.body);

  const result = await pool.query(
    `INSERT INTO poster_templates (
      workspace_id, name, template_type, design_data, created_by
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [workspaceId, data.name, data.templateType, JSON.stringify(data.designData), userId]
  );

  res.status(201).json(result.rows[0]);
};

export const deletePosterTemplate = async (req: AuthRequest, res: Response) => {
  const { workspaceId, templateId } = req.params;

  const result = await pool.query(
    'DELETE FROM poster_templates WHERE id = $1 AND workspace_id = $2 RETURNING id',
    [templateId, workspaceId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Template not found');
  }

  res.json({ message: 'Template deleted successfully' });
};
