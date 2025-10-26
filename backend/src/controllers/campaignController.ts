import { Request, Response } from 'express';
import campaignService from '../services/campaignService';

class CampaignController {
  async createCampaign(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const campaign = await campaignService.createCampaign({
        ...req.body,
        workspace_id: workspaceId,
      });
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }

  async getCampaigns(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const filters = {
        status: req.query.status,
        type: req.query.type,
        owner_id: req.query.owner_id,
      };

      const campaigns = await campaignService.getCampaigns(workspaceId, filters);
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }

  async getCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.getCampaign(id);

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  }

  async updateCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.updateCampaign(id, req.body);
      res.json(campaign);
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      if (error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  }

  async deleteCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await campaignService.deleteCampaign(id);
      res.json({ message: 'Campaign deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      if (error.message === 'Campaign not found') {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  async addMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const member = await campaignService.addMember({
        ...req.body,
        campaign_id: id,
      });
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding campaign member:', error);
      res.status(500).json({ error: 'Failed to add campaign member' });
    }
  }

  async addMembers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { members } = req.body;

      if (!Array.isArray(members)) {
        return res.status(400).json({ error: 'members must be an array' });
      }

      const result = await campaignService.addMembers(id, members);
      res.json(result);
    } catch (error) {
      console.error('Error adding campaign members:', error);
      res.status(500).json({ error: 'Failed to add campaign members' });
    }
  }

  async removeMember(req: Request, res: Response) {
    try {
      const { id, member_id } = req.params;
      await campaignService.removeMember(member_id);
      res.json({ message: 'Campaign member removed successfully' });
    } catch (error: any) {
      console.error('Error removing campaign member:', error);
      if (error.message === 'Campaign member not found') {
        return res.status(404).json({ error: 'Campaign member not found' });
      }
      res.status(500).json({ error: 'Failed to remove campaign member' });
    }
  }

  async markMemberResponded(req: Request, res: Response) {
    try {
      const { id, member_id } = req.params;
      const member = await campaignService.markMemberResponded(member_id);
      res.json({
        message: 'Campaign member marked as responded',
        member,
      });
    } catch (error: any) {
      console.error('Error marking campaign member as responded:', error);
      if (error.message === 'Campaign member not found') {
        return res.status(404).json({ error: 'Campaign member not found' });
      }
      res.status(500).json({ error: 'Failed to mark campaign member as responded' });
    }
  }

  async getCampaignMembers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const members = await campaignService.getCampaignMembers(id);
      res.json(members);
    } catch (error) {
      console.error('Error fetching campaign members:', error);
      res.status(500).json({ error: 'Failed to fetch campaign members' });
    }
  }

  async getCampaignMetrics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const metrics = await campaignService.getCampaignMetrics(id);

      if (!metrics) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching campaign metrics:', error);
      res.status(500).json({ error: 'Failed to fetch campaign metrics' });
    }
  }

  async getCampaignsPerformance(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const performance = await campaignService.getCampaignsPerformance(workspaceId);
      res.json(performance);
    } catch (error) {
      console.error('Error fetching campaigns performance:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns performance' });
    }
  }
}

export default new CampaignController();
