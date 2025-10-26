import { Request, Response } from 'express';
import emailService from '../services/emailService';

class EmailController {
  async createEmail(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const email = await emailService.createEmail({
        ...req.body,
        workspace_id: workspaceId,
      });
      res.status(201).json(email);
    } catch (error) {
      console.error('Error creating email:', error);
      res.status(500).json({ error: 'Failed to create email' });
    }
  }

  async getEmails(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const filters = {
        status: req.query.status,
        lead_id: req.query.lead_id,
        contact_id: req.query.contact_id,
        opportunity_id: req.query.opportunity_id,
        sent_by: req.query.sent_by,
      };

      const emails = await emailService.getEmails(workspaceId, filters);
      res.json(emails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  }

  async getEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const email = await emailService.getEmail(id);

      if (!email) {
        return res.status(404).json({ error: 'Email not found' });
      }

      res.json(email);
    } catch (error) {
      console.error('Error fetching email:', error);
      res.status(500).json({ error: 'Failed to fetch email' });
    }
  }

  async updateEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const email = await emailService.updateEmail(id, req.body);
      res.json(email);
    } catch (error: any) {
      console.error('Error updating email:', error);
      if (error.message === 'Email not found or cannot be updated (only drafts can be edited)') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      res.status(500).json({ error: 'Failed to update email' });
    }
  }

  async sendEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const email = await emailService.sendEmail(id);
      res.json({
        message: 'Email sent successfully',
        email,
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      if (error.message === 'Email not found or already sent') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to send email' });
    }
  }

  async trackEmailOpen(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await emailService.trackEmailOpen(id);
      res.json({ message: 'Email open tracked' });
    } catch (error) {
      console.error('Error tracking email open:', error);
      res.status(500).json({ error: 'Failed to track email open' });
    }
  }

  async markDelivered(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await emailService.markDelivered(id);
      res.json({ message: 'Email marked as delivered' });
    } catch (error) {
      console.error('Error marking email as delivered:', error);
      res.status(500).json({ error: 'Failed to mark email as delivered' });
    }
  }

  async markBounced(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await emailService.markBounced(id);
      res.json({ message: 'Email marked as bounced' });
    } catch (error) {
      console.error('Error marking email as bounced:', error);
      res.status(500).json({ error: 'Failed to mark email as bounced' });
    }
  }

  async markFailed(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await emailService.markFailed(id);
      res.json({ message: 'Email marked as failed' });
    } catch (error) {
      console.error('Error marking email as failed:', error);
      res.status(500).json({ error: 'Failed to mark email as failed' });
    }
  }

  async deleteEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await emailService.deleteEmail(id);
      res.json({ message: 'Email deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting email:', error);
      if (error.message === 'Email not found') {
        return res.status(404).json({ error: 'Email not found' });
      }
      res.status(500).json({ error: 'Failed to delete email' });
    }
  }

  async getEmailStats(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const { date_from, date_to } = req.query;

      const stats = await emailService.getEmailStats(
        workspaceId,
        date_from ? new Date(date_from as string) : undefined,
        date_to ? new Date(date_to as string) : undefined
      );
      res.json(stats);
    } catch (error) {
      console.error('Error fetching email stats:', error);
      res.status(500).json({ error: 'Failed to fetch email stats' });
    }
  }

  async getEmailsByRelationship(req: Request, res: Response) {
    try {
      const { type, id } = req.params;

      if (!['lead', 'contact', 'opportunity'].includes(type)) {
        return res.status(400).json({ error: 'Invalid relationship type' });
      }

      const emails = await emailService.getEmailsByRelationship(
        type as 'lead' | 'contact' | 'opportunity',
        id
      );
      res.json(emails);
    } catch (error) {
      console.error('Error fetching emails by relationship:', error);
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  }
}

export default new EmailController();
