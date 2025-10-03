import { Response } from 'express';
import { AuthRequest } from '../types';
import pool from '../database/db';
import { z } from 'zod';
import {
  CreateHabitRequest,
  UpdateHabitRequest,
  CreateCheckinRequest,
  CreatePersonalTaskRequest,
  UpdatePersonalTaskRequest,
  CreateMetricRequest,
  UpdateMetricRequest,
  CreateMetricEntryRequest,
  HabitWithStats,
  HabitStats,
} from '../types/personal';

// Validation schemas
const createHabitSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  target_type: z.enum(['boolean', 'numeric', 'duration']),
  target_value: z.number().optional(),
  target_unit: z.string().max(50).optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
  frequency_days: z.array(z.number().min(0).max(6)).optional(),
});

const createCheckinSchema = z.object({
  habit_id: z.number().int().positive(),
  check_date: z.string().optional(),
  value: z.number().optional(),
  completed: z.boolean().default(false),
  notes: z.string().optional(),
  mood: z.enum(['great', 'good', 'okay', 'bad']).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).default('todo'),
  due_date: z.string().optional(),
  reminder_time: z.string().optional(),
});

const createMetricSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  unit: z.string().max(50).optional(),
  metric_type: z.enum(['numeric', 'boolean', 'text']).default('numeric'),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  chart_type: z.enum(['line', 'bar', 'area']).default('line'),
});

const createMetricEntrySchema = z.object({
  metric_id: z.number().int().positive(),
  entry_date: z.string().optional(),
  value: z.number().optional(),
  text_value: z.string().optional(),
  notes: z.string().optional(),
});

// Helper function to calculate streak
async function calculateStreak(habitId: number, userId: number): Promise<HabitStats> {
  const client = await pool.connect();
  try {
    // Get all check-ins for this habit ordered by date desc
    const checkinsResult = await client.query(
      `SELECT check_date, completed
       FROM personal_habit_checkins
       WHERE habit_id = $1 AND user_id = $2
       ORDER BY check_date DESC`,
      [habitId, userId]
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let totalCheckins = checkinsResult.rows.length;
    let completedCheckins = 0;
    let thisWeekCount = 0;
    let thisMonthCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    let expectedDate = new Date(today);
    let streakActive = true;

    for (const row of checkinsResult.rows) {
      const checkDate = new Date(row.check_date);
      checkDate.setHours(0, 0, 0, 0);

      if (row.completed) {
        completedCheckins++;

        // Count for this week/month
        if (checkDate >= weekAgo) thisWeekCount++;
        if (checkDate >= monthAgo) thisMonthCount++;

        // Current streak calculation
        if (streakActive) {
          if (checkDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else {
            streakActive = false;
          }
        }

        // Track all streaks for longest
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
        streakActive = false;
      }
    }

    const completionRate = totalCheckins > 0 ? (completedCheckins / totalCheckins) * 100 : 0;

    return {
      habit_id: habitId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_checkins: totalCheckins,
      completion_rate: Math.round(completionRate),
      this_week_count: thisWeekCount,
      this_month_count: thisMonthCount,
    };
  } finally {
    client.release();
  }
}

// Helper function to check workspace membership
async function checkWorkspaceMembership(workspaceId: number, userId: string): Promise<void> {
  const memberCheck = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new Error('Not a member of this workspace');
  }
}

// Habit Controllers
export const createHabit = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createHabitSchema.parse(req.body) as CreateHabitRequest;

    const result = await pool.query(
      `INSERT INTO personal_habits
       (user_id, workspace_id, name, description, category, icon, color,
        target_type, target_value, target_unit, frequency, frequency_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        workspaceId,
        data.name,
        data.description,
        data.category,
        data.icon,
        data.color,
        data.target_type,
        data.target_value,
        data.target_unit,
        data.frequency,
        data.frequency_days,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating habit:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create habit' });
  }
};

export const getHabits = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;
    const includeArchived = req.query.includeArchived === 'true';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT h.*,
             COUNT(hc.id) as total_checkins,
             COUNT(CASE WHEN hc.completed = true THEN 1 END) as completed_checkins
      FROM personal_habits h
      LEFT JOIN personal_habit_checkins hc ON h.id = hc.habit_id
      WHERE h.user_id = $1 AND h.workspace_id = $2
    `;

    if (!includeArchived) {
      query += ` AND h.is_active = true`;
    }

    query += ` GROUP BY h.id ORDER BY h.created_at DESC`;

    const result = await pool.query(query, [userId, workspaceId]);

    // Calculate stats for each habit
    const habitsWithStats: HabitWithStats[] = await Promise.all(
      result.rows.map(async (habit: any) => {
        const stats = await calculateStreak(habit.id, userId);

        // Get last check-in
        const lastCheckinResult = await pool.query(
          `SELECT * FROM personal_habit_checkins
           WHERE habit_id = $1 AND user_id = $2
           ORDER BY check_date DESC LIMIT 1`,
          [habit.id, userId]
        );

        return {
          ...habit,
          current_streak: stats.current_streak,
          longest_streak: stats.longest_streak,
          total_checkins: stats.total_checkins,
          completion_rate: stats.completion_rate,
          last_checkin: lastCheckinResult.rows[0] || null,
        };
      })
    );

    res.json(habitsWithStats);
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
};

export const getHabit = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.habitId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT * FROM personal_habits WHERE id = $1 AND user_id = $2',
      [habitId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const stats = await calculateStreak(habitId, userId);

    res.json({ ...result.rows[0], ...stats });
  } catch (error) {
    console.error('Error fetching habit:', error);
    res.status(500).json({ error: 'Failed to fetch habit' });
  }
};

export const updateHabit = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.habitId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = req.body as UpdateHabitRequest;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(habitId, userId);

    const result = await pool.query(
      `UPDATE personal_habits SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating habit:', error);
    res.status(500).json({ error: 'Failed to update habit' });
  }
};

export const deleteHabit = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.habitId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'DELETE FROM personal_habits WHERE id = $1 AND user_id = $2 RETURNING id',
      [habitId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error('Error deleting habit:', error);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
};

// Check-in Controllers
export const createCheckin = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createCheckinSchema.parse(req.body) as CreateCheckinRequest;
    const checkDate = data.check_date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO personal_habit_checkins
       (habit_id, user_id, check_date, value, completed, notes, mood)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (habit_id, check_date)
       DO UPDATE SET value = $4, completed = $5, notes = $6, mood = $7
       RETURNING *`,
      [data.habit_id, userId, checkDate, data.value, data.completed, data.notes, data.mood]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating check-in:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create check-in' });
  }
};

export const getCheckins = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.habitId);
    const userId = req.user?.id;
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT * FROM personal_habit_checkins
      WHERE habit_id = $1 AND user_id = $2
    `;
    const params: any[] = [habitId, userId];

    if (startDate) {
      params.push(startDate);
      query += ` AND check_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND check_date <= $${params.length}`;
    }

    query += ' ORDER BY check_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
};

// Personal Task Controllers
export const createPersonalTask = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = createTaskSchema.parse(req.body) as CreatePersonalTaskRequest;

    const result = await pool.query(
      `INSERT INTO personal_tasks
       (user_id, workspace_id, title, description, category, priority, status, due_date, reminder_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        workspaceId,
        data.title,
        data.description,
        data.category,
        data.priority,
        data.status,
        data.due_date,
        data.reminder_time,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating personal task:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const getPersonalTasks = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = 'SELECT * FROM personal_tasks WHERE user_id = $1 AND workspace_id = $2';
    const params: any[] = [userId, workspaceId];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY due_date ASC NULLS LAST, created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching personal tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const updatePersonalTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = req.body as UpdatePersonalTaskRequest;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    // Auto-set completed_at when status changes to completed
    if (data.status === 'completed') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(taskId, userId);

    const result = await pool.query(
      `UPDATE personal_tasks SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating personal task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deletePersonalTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'DELETE FROM personal_tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [taskId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting personal task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// Dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get habit stats
    const habitsResult = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN is_active = true THEN 1 END) as active
       FROM personal_habits
       WHERE user_id = $1 AND workspace_id = $2`,
      [userId, workspaceId]
    );

    // Get today's check-ins
    const todayCheckinsResult = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN completed = true THEN 1 END) as completed
       FROM personal_habit_checkins hc
       JOIN personal_habits h ON hc.habit_id = h.id
       WHERE hc.user_id = $1 AND h.workspace_id = $2 AND hc.check_date = $3`,
      [userId, workspaceId, today]
    );

    // Get active habits for today
    const activeHabitsResult = await pool.query(
      'SELECT COUNT(*) as count FROM personal_habits WHERE user_id = $1 AND workspace_id = $2 AND is_active = true',
      [userId, workspaceId]
    );

    // Get upcoming tasks
    const upcomingTasksResult = await pool.query(
      `SELECT * FROM personal_tasks
       WHERE user_id = $1 AND workspace_id = $2 AND status != 'completed'
       ORDER BY due_date ASC NULLS LAST LIMIT 5`,
      [userId, workspaceId]
    );

    const stats = {
      total_habits: parseInt(habitsResult.rows[0].total),
      active_habits: parseInt(habitsResult.rows[0].active),
      today_completed: parseInt(todayCheckinsResult.rows[0]?.completed || 0),
      today_pending:
        parseInt(activeHabitsResult.rows[0].count) - parseInt(todayCheckinsResult.rows[0]?.completed || 0),
      upcoming_tasks: upcomingTasksResult.rows,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// Daily Checklist Controllers
export const getDailyChecklist = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;
    const { date } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT * FROM daily_checklist_items
       WHERE user_id = $1 AND workspace_id = $2 AND task_date = $3
       ORDER BY sort_order ASC, created_at ASC`,
      [userId, workspaceId, taskDate]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily checklist:', error);
    res.status(500).json({ error: 'Failed to fetch daily checklist' });
  }
};

export const bulkCreateChecklistItems = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;
    const { items, date } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const taskDate = date || new Date().toISOString().split('T')[0];

    // Get current max sort_order for this date
    const maxOrderResult = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) as max_order
       FROM daily_checklist_items
       WHERE user_id = $1 AND workspace_id = $2 AND task_date = $3`,
      [userId, workspaceId, taskDate]
    );

    let currentOrder = parseInt(maxOrderResult.rows[0].max_order) + 1;

    // Insert all items
    const insertPromises = items.map((content: string, index: number) => {
      return pool.query(
        `INSERT INTO daily_checklist_items
         (user_id, workspace_id, content, task_date, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, workspaceId, content.trim(), taskDate, currentOrder + index]
      );
    });

    const results = await Promise.all(insertPromises);
    const createdItems = results.map((r: any) => r.rows[0]);

    res.status(201).json(createdItems);
  } catch (error) {
    console.error('Error creating checklist items:', error);
    res.status(500).json({ error: 'Failed to create checklist items' });
  }
};

export const toggleChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Toggle the completed status
    const result = await pool.query(
      `UPDATE daily_checklist_items
       SET completed = NOT completed,
           completed_at = CASE WHEN completed = false THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling checklist item:', error);
    res.status(500).json({ error: 'Failed to toggle checklist item' });
  }
};

export const deleteChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'DELETE FROM daily_checklist_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
};

export const clearCompletedChecklistItems = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;
    const { date } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `DELETE FROM daily_checklist_items
       WHERE user_id = $1 AND workspace_id = $2 AND task_date = $3 AND completed = true
       RETURNING id`,
      [userId, workspaceId, taskDate]
    );

    res.json({ message: 'Completed items cleared', count: result.rows.length });
  } catch (error) {
    console.error('Error clearing completed items:', error);
    res.status(500).json({ error: 'Failed to clear completed items' });
  }
};

// Recurring Tasks Controllers
export const getRecurringTasks = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT * FROM recurring_tasks
       WHERE user_id = $1 AND workspace_id = $2
       ORDER BY created_at DESC`,
      [userId, workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recurring tasks:', error);
    res.status(500).json({ error: 'Failed to fetch recurring tasks' });
  }
};

export const createRecurringTask = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;
    const { content, frequency, frequency_days, start_date, end_date } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content || !frequency) {
      return res.status(400).json({ error: 'Content and frequency are required' });
    }

    const result = await pool.query(
      `INSERT INTO recurring_tasks
       (user_id, workspace_id, content, frequency, frequency_days, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, workspaceId, content, frequency, frequency_days, start_date, end_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating recurring task:', error);
    res.status(500).json({ error: 'Failed to create recurring task' });
  }
};

export const updateRecurringTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const userId = req.user?.id;
    const { content, frequency, frequency_days, is_active, start_date, end_date } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      values.push(content);
      paramIndex++;
    }
    if (frequency !== undefined) {
      updates.push(`frequency = $${paramIndex}`);
      values.push(frequency);
      paramIndex++;
    }
    if (frequency_days !== undefined) {
      updates.push(`frequency_days = $${paramIndex}`);
      values.push(frequency_days);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex}`);
      values.push(start_date);
      paramIndex++;
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex}`);
      values.push(end_date);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(taskId, userId);

    const result = await pool.query(
      `UPDATE recurring_tasks SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating recurring task:', error);
    res.status(500).json({ error: 'Failed to update recurring task' });
  }
};

export const deleteRecurringTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'DELETE FROM recurring_tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [taskId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring task not found' });
    }

    res.json({ message: 'Recurring task deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring task:', error);
    res.status(500).json({ error: 'Failed to delete recurring task' });
  }
};

// Generate daily checklist items from recurring tasks
export const generateRecurringTasks = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.user?.id;
    const { date } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const targetDayOfWeek = new Date(targetDate + 'T00:00:00').getDay();

    // Get all active recurring tasks for this user
    const recurringTasksResult = await pool.query(
      `SELECT * FROM recurring_tasks
       WHERE user_id = $1 AND workspace_id = $2 AND is_active = true
       AND (start_date IS NULL OR start_date <= $3)
       AND (end_date IS NULL OR end_date >= $3)`,
      [userId, workspaceId, targetDate]
    );

    const tasksToGenerate = recurringTasksResult.rows.filter((task: any) => {
      switch (task.frequency) {
        case 'daily':
          return true;
        case 'weekdays':
          return targetDayOfWeek >= 1 && targetDayOfWeek <= 5;
        case 'weekends':
          return targetDayOfWeek === 0 || targetDayOfWeek === 6;
        case 'weekly':
        case 'custom':
          return task.frequency_days && task.frequency_days.includes(targetDayOfWeek);
        default:
          return false;
      }
    });

    // Check which tasks already exist for this date
    const existingTasksResult = await pool.query(
      `SELECT recurring_task_id FROM daily_checklist_items
       WHERE user_id = $1 AND workspace_id = $2 AND task_date = $3 AND recurring_task_id IS NOT NULL`,
      [userId, workspaceId, targetDate]
    );

    const existingRecurringIds = new Set(
      existingTasksResult.rows.map((row: any) => row.recurring_task_id)
    );

    // Generate only new tasks
    const newTasks = tasksToGenerate.filter((task: any) => !existingRecurringIds.has(task.id));

    if (newTasks.length === 0) {
      return res.json({ message: 'No new recurring tasks to generate', count: 0 });
    }

    // Get current max sort_order
    const maxOrderResult = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) as max_order
       FROM daily_checklist_items
       WHERE user_id = $1 AND workspace_id = $2 AND task_date = $3`,
      [userId, workspaceId, targetDate]
    );

    let currentOrder = parseInt(maxOrderResult.rows[0].max_order) + 1;

    // Insert new checklist items
    const insertPromises = newTasks.map((task: any, index: number) => {
      return pool.query(
        `INSERT INTO daily_checklist_items
         (user_id, workspace_id, content, task_date, sort_order, recurring_task_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, workspaceId, task.content, targetDate, currentOrder + index, task.id]
      );
    });

    const results = await Promise.all(insertPromises);
    const createdItems = results.map((r: any) => r.rows[0]);

    res.json({ message: 'Recurring tasks generated', count: createdItems.length, items: createdItems });
  } catch (error) {
    console.error('Error generating recurring tasks:', error);
    res.status(500).json({ error: 'Failed to generate recurring tasks' });
  }
};
