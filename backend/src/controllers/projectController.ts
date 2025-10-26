import { Request, Response } from 'express';
import projectService from '../services/projectService';

class ProjectController {
  // Create a new project
  async createProject(req: Request, res: Response) {
    try {
      const { workspace_id, name, description, color, icon, default_view } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!workspace_id || !name) {
        return res.status(400).json({ error: 'workspace_id and name are required' });
      }

      const project = await projectService.createProject(
        { workspace_id, name, description, color, icon, default_view },
        userId
      );

      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  // Get all projects in a workspace
  async getProjectsByWorkspace(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projects = await projectService.getProjectsByWorkspace(workspaceId, userId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  // Get a single project with details
  async getProjectById(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const project = await projectService.getProjectById(projectId, userId);
      res.json(project);
    } catch (error: any) {
      console.error('Error fetching project:', error);
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  // Update a project
  async updateProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user has edit access
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || (access.role !== 'owner' && access.role !== 'editor')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const project = await projectService.updateProject(projectId, req.body, userId);
      res.json(project);
    } catch (error: any) {
      console.error('Error updating project:', error);
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  // Archive a project
  async archiveProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is owner
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || access.role !== 'owner') {
        return res.status(403).json({ error: 'Only project owners can archive projects' });
      }

      await projectService.archiveProject(projectId);
      res.json({ message: 'Project archived successfully' });
    } catch (error) {
      console.error('Error archiving project:', error);
      res.status(500).json({ error: 'Failed to archive project' });
    }
  }

  // Delete a project
  async deleteProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is owner
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || access.role !== 'owner') {
        return res.status(403).json({ error: 'Only project owners can delete projects' });
      }

      await projectService.deleteProject(projectId);
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  // Add member to project
  async addMember(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { user_id, role } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!user_id || !role) {
        return res.status(400).json({ error: 'user_id and role are required' });
      }

      // Check if user has permission to add members
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || (access.role !== 'owner' && access.role !== 'editor')) {
        return res.status(403).json({ error: 'Insufficient permissions to add members' });
      }

      const member = await projectService.addMember(projectId, user_id, role);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding member:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  }

  // Remove member from project
  async removeMember(req: Request, res: Response) {
    try {
      const { projectId, userId: memberUserId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user has permission to remove members
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || access.role !== 'owner') {
        return res.status(403).json({ error: 'Only project owners can remove members' });
      }

      await projectService.removeMember(projectId, memberUserId);
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  // Update member role
  async updateMemberRole(req: Request, res: Response) {
    try {
      const { projectId, userId: memberUserId } = req.params;
      const { role } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!role) {
        return res.status(400).json({ error: 'role is required' });
      }

      // Check if user has permission to update roles
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || access.role !== 'owner') {
        return res.status(403).json({ error: 'Only project owners can update member roles' });
      }

      const member = await projectService.updateMemberRole(projectId, memberUserId, role);
      res.json(member);
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }

  // Create section
  async createSection(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, position } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      // Check if user has edit access
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || (access.role !== 'owner' && access.role !== 'editor')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const section = await projectService.createSection(projectId, name, position);
      res.status(201).json(section);
    } catch (error) {
      console.error('Error creating section:', error);
      res.status(500).json({ error: 'Failed to create section' });
    }
  }

  // Update section
  async updateSection(req: Request, res: Response) {
    try {
      const { sectionId } = req.params;
      const { name, position } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const section = await projectService.updateSection(sectionId, name, position);
      res.json(section);
    } catch (error) {
      console.error('Error updating section:', error);
      res.status(500).json({ error: 'Failed to update section' });
    }
  }

  // Delete section
  async deleteSection(req: Request, res: Response) {
    try {
      const { sectionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await projectService.deleteSection(sectionId);
      res.json({ message: 'Section deleted successfully' });
    } catch (error) {
      console.error('Error deleting section:', error);
      res.status(500).json({ error: 'Failed to delete section' });
    }
  }

  // Reorder sections
  async reorderSections(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { section_ids } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!Array.isArray(section_ids)) {
        return res.status(400).json({ error: 'section_ids must be an array' });
      }

      // Check if user has edit access
      const access = await projectService.checkAccess(projectId, userId);
      if (!access.hasAccess || (access.role !== 'owner' && access.role !== 'editor')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await projectService.reorderSections(projectId, section_ids);
      res.json({ message: 'Sections reordered successfully' });
    } catch (error) {
      console.error('Error reordering sections:', error);
      res.status(500).json({ error: 'Failed to reorder sections' });
    }
  }
}

export default new ProjectController();
