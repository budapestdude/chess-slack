import { Request, Response } from 'express';
import opportunityService from '../services/opportunityService';

class OpportunityController {
  async createOpportunity(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const opportunity = await opportunityService.createOpportunity({
        ...req.body,
        workspace_id: workspaceId,
      });
      res.status(201).json(opportunity);
    } catch (error) {
      console.error('Error creating opportunity:', error);
      res.status(500).json({ error: 'Failed to create opportunity' });
    }
  }

  async getOpportunities(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const filters = {
        stage: req.query.stage,
        status: req.query.status,
        owner_id: req.query.owner_id,
        forecast_category: req.query.forecast_category,
        close_date_from: req.query.close_date_from,
        close_date_to: req.query.close_date_to,
      };

      const opportunities = await opportunityService.getOpportunities(workspaceId, filters);
      res.json(opportunities);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
  }

  async getOpportunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const opportunity = await opportunityService.getOpportunity(id);

      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      res.json(opportunity);
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      res.status(500).json({ error: 'Failed to fetch opportunity' });
    }
  }

  async updateOpportunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const opportunity = await opportunityService.updateOpportunity(id, req.body);
      res.json(opportunity);
    } catch (error: any) {
      console.error('Error updating opportunity:', error);
      if (error.message === 'Opportunity not found') {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      res.status(500).json({ error: 'Failed to update opportunity' });
    }
  }

  async deleteOpportunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await opportunityService.deleteOpportunity(id);
      res.json({ message: 'Opportunity deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting opportunity:', error);
      if (error.message === 'Opportunity not found') {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      res.status(500).json({ error: 'Failed to delete opportunity' });
    }
  }

  async markWon(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const opportunity = await opportunityService.markWon(id);
      res.json({
        message: 'Opportunity marked as won',
        opportunity,
      });
    } catch (error: any) {
      console.error('Error marking opportunity as won:', error);
      if (error.message === 'Opportunity not found') {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      res.status(500).json({ error: 'Failed to mark opportunity as won' });
    }
  }

  async markLost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { loss_reason } = req.body;

      if (!loss_reason) {
        return res.status(400).json({ error: 'Loss reason is required' });
      }

      const opportunity = await opportunityService.markLost(id, loss_reason);
      res.json({
        message: 'Opportunity marked as lost',
        opportunity,
      });
    } catch (error: any) {
      console.error('Error marking opportunity as lost:', error);
      if (error.message === 'Opportunity not found') {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      res.status(500).json({ error: 'Failed to mark opportunity as lost' });
    }
  }

  async addProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await opportunityService.addProduct({
        ...req.body,
        opportunity_id: id,
      });
      res.status(201).json(product);
    } catch (error) {
      console.error('Error adding product to opportunity:', error);
      res.status(500).json({ error: 'Failed to add product to opportunity' });
    }
  }

  async removeProduct(req: Request, res: Response) {
    try {
      const { id, product_id } = req.params;
      await opportunityService.removeProduct(product_id);
      res.json({ message: 'Product removed successfully' });
    } catch (error) {
      console.error('Error removing product from opportunity:', error);
      res.status(500).json({ error: 'Failed to remove product from opportunity' });
    }
  }

  async getForecast(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const { owner_id } = req.query;

      const forecast = await opportunityService.getForecast(
        workspaceId,
        owner_id as string | undefined
      );
      res.json(forecast);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      res.status(500).json({ error: 'Failed to fetch forecast' });
    }
  }

  async getPipelineMetrics(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const { owner_id } = req.query;

      const metrics = await opportunityService.getPipelineMetrics(
        workspaceId,
        owner_id as string | undefined
      );
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching pipeline metrics:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline metrics' });
    }
  }

  async getWinLossAnalysis(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const { date_from, date_to } = req.query;

      const analysis = await opportunityService.getWinLossAnalysis(
        workspaceId,
        date_from ? new Date(date_from as string) : undefined,
        date_to ? new Date(date_to as string) : undefined
      );
      res.json(analysis);
    } catch (error) {
      console.error('Error fetching win/loss analysis:', error);
      res.status(500).json({ error: 'Failed to fetch win/loss analysis' });
    }
  }
}

export default new OpportunityController();
