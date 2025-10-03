-- Migration: Add Recurring Tasks
-- Description: Templates for tasks that automatically appear on daily checklists
-- Created: 2025-10-03

-- Recurring Tasks Table
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Task details
  content TEXT NOT NULL,

  -- Recurrence pattern
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'weekdays', 'weekends', 'custom'
  frequency_days INTEGER[], -- [0,1,2,3,4,5,6] for days of week (0=Sunday) - used for weekly/custom

  -- Active status
  is_active BOOLEAN DEFAULT true,

  -- Time range (optional - when this recurring task is active)
  start_date DATE,
  end_date DATE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT check_frequency CHECK (frequency IN ('daily', 'weekly', 'weekdays', 'weekends', 'custom'))
);

-- Indexes
CREATE INDEX idx_recurring_tasks_user ON recurring_tasks(user_id);
CREATE INDEX idx_recurring_tasks_workspace ON recurring_tasks(workspace_id);
CREATE INDEX idx_recurring_tasks_active ON recurring_tasks(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER trigger_recurring_tasks_updated_at
  BEFORE UPDATE ON recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();

-- Add source tracking to daily_checklist_items
ALTER TABLE daily_checklist_items
ADD COLUMN IF NOT EXISTS recurring_task_id INTEGER REFERENCES recurring_tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_daily_checklist_recurring ON daily_checklist_items(recurring_task_id);
