import { Response } from 'express';
import pool from '../database/db';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';

// ============ SPRINTS ============

export const getSprints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const { status } = req.query;

  let query = `
    SELECT
      s.*,
      u.name as created_by_username,
      (SELECT COUNT(*) FROM sprint_tasks WHERE sprint_id = s.id) as task_count,
      (SELECT COUNT(*) FROM sprint_tasks WHERE sprint_id = s.id AND status = 'completed') as completed_task_count,
      (SELECT json_agg(json_build_object('id', sm.user_id, 'name', su.name, 'role', sm.role))
       FROM sprint_members sm
       JOIN users su ON sm.user_id = su.id
       WHERE sm.sprint_id = s.id) as members
    FROM marketing_sprints s
    JOIN users u ON s.created_by = u.id
    WHERE s.workspace_id = $1
  `;

  const params: any[] = [workspaceId];

  if (status) {
    query += ` AND s.status = $2`;
    params.push(status);
  }

  query += ` ORDER BY s.start_date DESC`;

  const result = await pool.query(query, params);
  res.json({ sprints: result.rows });
});

export const getSprint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;

  const result = await pool.query(
    `
    SELECT
      s.*,
      u.name as created_by_username,
      (SELECT json_agg(json_build_object('id', sm.user_id, 'name', su.name, 'role', sm.role))
       FROM sprint_members sm
       JOIN users su ON sm.user_id = su.id
       WHERE sm.sprint_id = s.id) as members
    FROM marketing_sprints s
    JOIN users u ON s.created_by = u.id
    WHERE s.id = $1 AND s.workspace_id = $2
    `,
    [sprintId, workspaceId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  res.json(result.rows[0]);
});

export const createSprint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.userId!;
  const { name, description, goal, startDate, endDate, budget, targetAudience, kpis, memberIds } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create sprint
    const sprintResult = await client.query(
      `
      INSERT INTO marketing_sprints (
        workspace_id, name, description, goal, start_date, end_date,
        budget, target_audience, kpis, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [workspaceId, name, description, goal, startDate, endDate, budget, targetAudience, kpis, userId]
    );

    const sprint = sprintResult.rows[0];

    // Add creator as lead
    await client.query(
      'INSERT INTO sprint_members (sprint_id, user_id, role) VALUES ($1, $2, $3)',
      [sprint.id, userId, 'lead']
    );

    // Add other members
    if (memberIds && Array.isArray(memberIds)) {
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await client.query(
            'INSERT INTO sprint_members (sprint_id, user_id, role) VALUES ($1, $2, $3)',
            [sprint.id, memberId, 'member']
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(sprint);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export const updateSprint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;
  const { name, description, goal, startDate, endDate, status, budget, targetAudience, kpis } = req.body;

  const result = await pool.query(
    `
    UPDATE marketing_sprints
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      goal = COALESCE($3, goal),
      start_date = COALESCE($4, start_date),
      end_date = COALESCE($5, end_date),
      status = COALESCE($6, status),
      budget = COALESCE($7, budget),
      target_audience = COALESCE($8, target_audience),
      kpis = COALESCE($9, kpis)
    WHERE id = $10 AND workspace_id = $11
    RETURNING *
    `,
    [name, description, goal, startDate, endDate, status, budget, targetAudience, kpis, sprintId, workspaceId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  res.json(result.rows[0]);
});

export const deleteSprint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;

  await pool.query(
    'DELETE FROM marketing_sprints WHERE id = $1 AND workspace_id = $2',
    [sprintId, workspaceId]
  );

  res.json({ message: 'Sprint deleted successfully' });
});

// ============ TASKS ============

export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;

  const result = await pool.query(
    `
    SELECT
      t.*,
      u.name as created_by_username,
      au.name as assigned_to_username,
      ec.name as email_campaign_name,
      sp.content as social_post_content,
      pt.name as poster_template_name,
      s.name as sponsor_name
    FROM sprint_tasks t
    JOIN users u ON t.created_by = u.id
    LEFT JOIN users au ON t.assigned_to = au.id
    LEFT JOIN email_campaigns ec ON t.email_campaign_id = ec.id
    LEFT JOIN social_media_posts sp ON t.social_post_id = sp.id
    LEFT JOIN poster_templates pt ON t.poster_template_id = pt.id
    LEFT JOIN sponsors s ON t.sponsor_id = s.id
    WHERE t.sprint_id = $1
    ORDER BY
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      t.due_date NULLS LAST,
      t.created_at
    `,
    [sprintId]
  );

  res.json({ tasks: result.rows });
});

export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId, taskId } = req.params;

  const result = await pool.query(
    `
    SELECT
      t.*,
      u.name as created_by_username,
      au.name as assigned_to_username
    FROM sprint_tasks t
    JOIN users u ON t.created_by = u.id
    LEFT JOIN users au ON t.assigned_to = au.id
    WHERE t.id = $1 AND t.sprint_id = $2
    `,
    [taskId, sprintId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(result.rows[0]);
});

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;
  const userId = req.userId!;
  const {
    title,
    description,
    taskType,
    status,
    priority,
    assignedTo,
    dueDate,
    estimatedHours,
    dependencies,
    checklist,
    attachments,
    emailCampaignId,
    socialPostId,
    posterTemplateId,
    sponsorId
  } = req.body;

  const result = await pool.query(
    `
    INSERT INTO sprint_tasks (
      sprint_id, title, description, task_type, status, priority,
      assigned_to, due_date, estimated_hours, dependencies, checklist,
      attachments, email_campaign_id, social_post_id, poster_template_id,
      sponsor_id, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
    `,
    [
      sprintId, title, description, taskType, status || 'todo', priority || 'medium',
      assignedTo, dueDate, estimatedHours, dependencies, checklist,
      attachments, emailCampaignId, socialPostId, posterTemplateId,
      sponsorId, userId
    ]
  );

  res.status(201).json(result.rows[0]);
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId, taskId } = req.params;
  const {
    title,
    description,
    taskType,
    status,
    priority,
    assignedTo,
    dueDate,
    estimatedHours,
    actualHours,
    dependencies,
    checklist,
    attachments
  } = req.body;

  const result = await pool.query(
    `
    UPDATE sprint_tasks
    SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      task_type = COALESCE($3, task_type),
      status = COALESCE($4, status),
      priority = COALESCE($5, priority),
      assigned_to = COALESCE($6, assigned_to),
      due_date = COALESCE($7, due_date),
      estimated_hours = COALESCE($8, estimated_hours),
      actual_hours = COALESCE($9, actual_hours),
      dependencies = COALESCE($10, dependencies),
      checklist = COALESCE($11, checklist),
      attachments = COALESCE($12, attachments)
    WHERE id = $13 AND sprint_id = $14
    RETURNING *
    `,
    [
      title, description, taskType, status, priority, assignedTo,
      dueDate, estimatedHours, actualHours, dependencies, checklist,
      attachments, taskId, sprintId
    ]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(result.rows[0]);
});

export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId, taskId } = req.params;

  await pool.query(
    'DELETE FROM sprint_tasks WHERE id = $1 AND sprint_id = $2',
    [taskId, sprintId]
  );

  res.json({ message: 'Task deleted successfully' });
});

// ============ METRICS ============

export const getMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;

  const result = await pool.query(
    `
    SELECT * FROM sprint_metrics
    WHERE sprint_id = $1
    ORDER BY metric_date DESC
    `,
    [sprintId]
  );

  res.json({ metrics: result.rows });
});

export const updateMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;
  const {
    metricDate,
    emailSends,
    emailOpens,
    emailClicks,
    socialPosts,
    socialEngagements,
    websiteVisits,
    conversions,
    sponsorContacts,
    additionalMetrics
  } = req.body;

  const result = await pool.query(
    `
    INSERT INTO sprint_metrics (
      sprint_id, metric_date, email_sends, email_opens, email_clicks,
      social_posts, social_engagements, website_visits, conversions,
      sponsor_contacts, additional_metrics
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (sprint_id, metric_date)
    DO UPDATE SET
      email_sends = EXCLUDED.email_sends,
      email_opens = EXCLUDED.email_opens,
      email_clicks = EXCLUDED.email_clicks,
      social_posts = EXCLUDED.social_posts,
      social_engagements = EXCLUDED.social_engagements,
      website_visits = EXCLUDED.website_visits,
      conversions = EXCLUDED.conversions,
      sponsor_contacts = EXCLUDED.sponsor_contacts,
      additional_metrics = EXCLUDED.additional_metrics
    RETURNING *
    `,
    [
      sprintId, metricDate, emailSends, emailOpens, emailClicks,
      socialPosts, socialEngagements, websiteVisits, conversions,
      sponsorContacts, additionalMetrics
    ]
  );

  res.json(result.rows[0]);
});

// ============ PHASES ============

export const getPhases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;

  const result = await pool.query(
    `
    SELECT
      p.*,
      (SELECT COUNT(*) FROM sprint_tasks WHERE phase_id = p.id) as task_count,
      (SELECT COUNT(*) FROM sprint_tasks WHERE phase_id = p.id AND status = 'completed') as completed_task_count
    FROM sprint_phases p
    WHERE p.sprint_id = $1
    ORDER BY p.phase_order
    `,
    [sprintId]
  );

  res.json({ phases: result.rows });
});

export const createPhase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId } = req.params;
  const { name, description, phaseOrder, startDate, endDate, color } = req.body;

  const result = await pool.query(
    `
    INSERT INTO sprint_phases (
      sprint_id, name, description, phase_order, start_date, end_date, color
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [sprintId, name, description, phaseOrder, startDate, endDate, color || 'blue']
  );

  res.status(201).json(result.rows[0]);
});

export const updatePhase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId, phaseId } = req.params;
  const { name, description, phaseOrder, startDate, endDate, status, color } = req.body;

  const result = await pool.query(
    `
    UPDATE sprint_phases
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      phase_order = COALESCE($3, phase_order),
      start_date = COALESCE($4, start_date),
      end_date = COALESCE($5, end_date),
      status = COALESCE($6, status),
      color = COALESCE($7, color)
    WHERE id = $8 AND sprint_id = $9
    RETURNING *
    `,
    [name, description, phaseOrder, startDate, endDate, status, color, phaseId, sprintId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Phase not found' });
  }

  res.json(result.rows[0]);
});

export const deletePhase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId, sprintId, phaseId } = req.params;

  await pool.query(
    'DELETE FROM sprint_phases WHERE id = $1 AND sprint_id = $2',
    [phaseId, sprintId]
  );

  res.json({ message: 'Phase deleted successfully' });
});
