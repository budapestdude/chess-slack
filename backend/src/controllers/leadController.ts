import { Request, Response } from 'express';
import leadService from '../services/leadService';

class LeadController {
  async createLead(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const lead = await leadService.createLead({ ...req.body, workspace_id: workspaceId });
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }

  async getLeads(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const filters = {
        status: req.query.status,
        rating: req.query.rating,
        owner_id: req.query.owner_id,
        source: req.query.source,
        converted: req.query.converted === 'true' ? true : req.query.converted === 'false' ? false : undefined,
      };

      const leads = await leadService.getLeads(workspaceId, filters);
      res.json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  }

  async getLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lead = await leadService.getLead(id);

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json(lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: 'Failed to fetch lead' });
    }
  }

  async updateLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lead = await leadService.updateLead(id, req.body);
      res.json(lead);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      if (error.message === 'Lead not found') {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }

  async deleteLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await leadService.deleteLead(id);
      res.json({ message: 'Lead deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      if (error.message === 'Lead not found') {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  }

  async convertLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { createAccount, createOpportunity, opportunityData } = req.body;

      const result = await leadService.convertLead(
        id,
        createAccount !== false, // default to true
        createOpportunity === true,
        opportunityData
      );

      res.json({
        message: 'Lead converted successfully',
        ...result
      });
    } catch (error: any) {
      console.error('Error converting lead:', error);
      if (error.message === 'Lead not found') {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.status(500).json({ error: 'Failed to convert lead' });
    }
  }

  async updateLeadScore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const score = await leadService.updateLeadScore(null, id);
      res.json({ lead_id: id, score });
    } catch (error: any) {
      console.error('Error updating lead score:', error);
      if (error.message === 'Lead not found') {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.status(500).json({ error: 'Failed to update lead score' });
    }
  }

  async importLeads(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const { leads } = req.body;

      if (!Array.isArray(leads)) {
        return res.status(400).json({ error: 'leads must be an array' });
      }

      const result = await leadService.importLeads(workspaceId, leads);
      res.json(result);
    } catch (error) {
      console.error('Error importing leads:', error);
      res.status(500).json({ error: 'Failed to import leads' });
    }
  }
}

export default new LeadController();
