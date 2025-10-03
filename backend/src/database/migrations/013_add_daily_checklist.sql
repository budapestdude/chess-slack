-- Migration: Add Daily Checklist
-- Description: Quick daily task list that can be bulk added
-- Created: 2025-10-03

-- Daily Checklist Items Table
CREATE TABLE IF NOT EXISTS daily_checklist_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Task details
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  -- Date tracking
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Order for display
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_daily_checklist_user ON daily_checklist_items(user_id);
CREATE INDEX idx_daily_checklist_workspace ON daily_checklist_items(workspace_id);
CREATE INDEX idx_daily_checklist_date ON daily_checklist_items(task_date);
CREATE INDEX idx_daily_checklist_user_date ON daily_checklist_items(user_id, task_date);
CREATE INDEX idx_daily_checklist_completed ON daily_checklist_items(completed);

-- Trigger for updated_at
CREATE TRIGGER trigger_daily_checklist_updated_at
  BEFORE UPDATE ON daily_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();

-- Add to schema_migrations
INSERT INTO schema_migrations (version, name, executed_at)
VALUES (13, '013_add_daily_checklist', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;
