import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createHabit,
  getHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  createCheckin,
  getCheckins,
  createPersonalTask,
  getPersonalTasks,
  updatePersonalTask,
  deletePersonalTask,
  getDashboardStats,
  getDailyChecklist,
  bulkCreateChecklistItems,
  toggleChecklistItem,
  deleteChecklistItem,
  clearCompletedChecklistItems,
  rolloverIncompleteTasksToToday,
  getRecurringTasks,
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask,
  generateRecurringTasks,
} from '../controllers/personalController';

const router = express.Router();

// All routes require authentication and workspace membership
router.use('/:workspaceId/*', authenticateToken);

// Dashboard stats
router.get('/:workspaceId/stats', getDashboardStats);

// Habit routes
router.post('/:workspaceId/habits', createHabit);
router.get('/:workspaceId/habits', getHabits);
router.get('/:workspaceId/habits/:habitId', getHabit);
router.put('/:workspaceId/habits/:habitId', updateHabit);
router.delete('/:workspaceId/habits/:habitId', deleteHabit);

// Check-in routes
router.post('/:workspaceId/checkins', createCheckin);
router.get('/:workspaceId/habits/:habitId/checkins', getCheckins);

// Personal task routes
router.post('/:workspaceId/tasks', createPersonalTask);
router.get('/:workspaceId/tasks', getPersonalTasks);
router.put('/:workspaceId/tasks/:taskId', updatePersonalTask);
router.delete('/:workspaceId/tasks/:taskId', deletePersonalTask);

// Daily checklist routes
router.get('/:workspaceId/checklist', getDailyChecklist);
router.post('/:workspaceId/checklist/bulk', bulkCreateChecklistItems);
router.post('/:workspaceId/checklist/:itemId/toggle', toggleChecklistItem);
router.delete('/:workspaceId/checklist/:itemId', deleteChecklistItem);
router.delete('/:workspaceId/checklist/completed/clear', clearCompletedChecklistItems);
router.post('/:workspaceId/checklist/rollover', rolloverIncompleteTasksToToday);

// Recurring tasks routes
router.get('/:workspaceId/recurring', getRecurringTasks);
router.post('/:workspaceId/recurring', createRecurringTask);
router.put('/:workspaceId/recurring/:taskId', updateRecurringTask);
router.delete('/:workspaceId/recurring/:taskId', deleteRecurringTask);
router.post('/:workspaceId/recurring/generate', generateRecurringTasks);

export default router;
