import pool from '../database/db';
import { v4 as uuidv4 } from 'uuid';

interface Project {
  id?: string;
  workspace_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  owner_id: string;
  default_view?: 'list' | 'board' | 'timeline' | 'calendar';
  is_archived?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface ProjectMember {
  id?: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface ProjectSection {
  id?: string;
  project_id: string;
  name: string;
  position: number;
}

class ProjectService {
  // Create a new project
  async createProject(projectData: Project, userId: string): Promise<Project> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO projects (workspace_id, name, description, color, icon, owner_id, default_view, is_archived)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          projectData.workspace_id,
          projectData.name,
          projectData.description,
          projectData.color,
          projectData.icon,
          userId,
          projectData.default_view || 'list',
          false
        ]
      );

      const project = result.rows[0];

      // Add creator as project owner
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [project.id, userId, 'owner']
      );

      // Create default sections
      const defaultSections = [
        { name: 'To Do', position: 0 },
        { name: 'In Progress', position: 1 },
        { name: 'Done', position: 2 }
      ];

      for (const section of defaultSections) {
        await client.query(
          `INSERT INTO project_sections (project_id, name, position)
           VALUES ($1, $2, $3)`,
          [project.id, section.name, section.position]
        );
      }

      await client.query('COMMIT');
      return project;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all projects in a workspace
  async getProjectsByWorkspace(workspaceId: string, userId: string): Promise<Project[]> {
    const result = await pool.query(
      `SELECT p.*,
              pm.role as user_role,
              u.username as owner_name,
              u.email as owner_email,
              (SELECT COUNT(*) FROM agent_tasks WHERE project_id = p.id AND completed_at IS NULL) as active_tasks,
              (SELECT COUNT(*) FROM agent_tasks WHERE project_id = p.id AND completed_at IS NOT NULL) as completed_tasks
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.workspace_id = $1 AND p.is_archived = false
       ORDER BY p.created_at DESC`,
      [workspaceId, userId]
    );
    return result.rows;
  }

  // Get a single project with details
  async getProjectById(projectId: string, userId: string): Promise<any> {
    const projectResult = await pool.query(
      `SELECT p.*,
              pm.role as user_role,
              u.username as owner_name,
              u.email as owner_email
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1`,
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    const project = projectResult.rows[0];

    // Get sections
    const sectionsResult = await pool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM agent_tasks WHERE section_id = s.id) as task_count
       FROM project_sections s
       WHERE s.project_id = $1
       ORDER BY s.position`,
      [projectId]
    );

    // Get members
    const membersResult = await pool.query(
      `SELECT pm.*, u.username, u.email, u.avatar_url
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [projectId]
    );

    return {
      ...project,
      sections: sectionsResult.rows,
      members: membersResult.rows
    };
  }

  // Update project
  async updateProject(projectId: string, updates: Partial<Project>, userId: string): Promise<Project> {
    const allowedFields = ['name', 'description', 'color', 'icon', 'default_view'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(projectId);

    const result = await pool.query(
      `UPDATE projects
       SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return result.rows[0];
  }

  // Archive project
  async archiveProject(projectId: string): Promise<void> {
    await pool.query(
      `UPDATE projects SET is_archived = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [projectId]
    );
  }

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  }

  // Add member to project
  async addMember(projectId: string, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<ProjectMember> {
    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET role = $3
       RETURNING *`,
      [projectId, userId, role]
    );
    return result.rows[0];
  }

  // Remove member from project
  async removeMember(projectId: string, userId: string): Promise<void> {
    await pool.query(
      `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
  }

  // Update member role
  async updateMemberRole(projectId: string, userId: string, role: 'owner' | 'editor' | 'viewer'): Promise<ProjectMember> {
    const result = await pool.query(
      `UPDATE project_members
       SET role = $3
       WHERE project_id = $1 AND user_id = $2
       RETURNING *`,
      [projectId, userId, role]
    );
    return result.rows[0];
  }

  // Create section
  async createSection(projectId: string, name: string, position?: number): Promise<ProjectSection> {
    // If no position provided, add to end
    if (position === undefined) {
      const maxPosResult = await pool.query(
        `SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM project_sections WHERE project_id = $1`,
        [projectId]
      );
      position = maxPosResult.rows[0].next_position;
    }

    const result = await pool.query(
      `INSERT INTO project_sections (project_id, name, position)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, name, position]
    );
    return result.rows[0];
  }

  // Update section
  async updateSection(sectionId: string, name?: string, position?: number): Promise<ProjectSection> {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (position !== undefined) {
      updates.push(`position = $${paramCount}`);
      values.push(position);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(sectionId);

    const result = await pool.query(
      `UPDATE project_sections
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Delete section
  async deleteSection(sectionId: string): Promise<void> {
    await pool.query('DELETE FROM project_sections WHERE id = $1', [sectionId]);
  }

  // Reorder sections
  async reorderSections(projectId: string, sectionIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < sectionIds.length; i++) {
        await client.query(
          `UPDATE project_sections SET position = $1 WHERE id = $2 AND project_id = $3`,
          [i, sectionIds[i], projectId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Check if user has access to project
  async checkAccess(projectId: string, userId: string): Promise<{ hasAccess: boolean; role?: string }> {
    const result = await pool.query(
      `SELECT pm.role
       FROM project_members pm
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return { hasAccess: false };
    }

    return { hasAccess: true, role: result.rows[0].role };
  }
}

export default new ProjectService();
