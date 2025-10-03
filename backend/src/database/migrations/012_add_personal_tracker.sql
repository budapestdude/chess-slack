-- Migration: Add Personal Task Tracker System
-- Description: Tables for tracking personal habits, daily tasks, and metrics
-- Created: 2025-10-03

-- Personal Habits Table
CREATE TABLE IF NOT EXISTS personal_habits (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Habit details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'fitness', 'learning', 'health', 'productivity', 'hobbies'
  icon VARCHAR(50), -- emoji or icon identifier
  color VARCHAR(20), -- for UI theming

  -- Target configuration
  target_type VARCHAR(50) NOT NULL, -- 'boolean' (yes/no), 'numeric' (count), 'duration' (minutes)
  target_value DECIMAL(10,2), -- target number (e.g., 10000 steps, 30 minutes)
  target_unit VARCHAR(50), -- 'steps', 'minutes', 'pages', 'puzzles', 'exercises', etc.

  -- Frequency
  frequency VARCHAR(50) NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'custom'
  frequency_days INTEGER[], -- [0,1,2,3,4,5,6] for days of week (0=Sunday)

  -- Status
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT check_target_type CHECK (target_type IN ('boolean', 'numeric', 'duration')),
  CONSTRAINT check_frequency CHECK (frequency IN ('daily', 'weekly', 'custom'))
);

-- Personal Habit Check-ins Table
CREATE TABLE IF NOT EXISTS personal_habit_checkins (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES personal_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Check-in data
  check_date DATE NOT NULL, -- the date this check-in is for
  value DECIMAL(10,2), -- actual value achieved (steps, minutes, count, etc.)
  completed BOOLEAN DEFAULT false, -- whether target was met

  -- Notes
  notes TEXT,
  mood VARCHAR(50), -- optional mood tracking: 'great', 'good', 'okay', 'bad'

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One check-in per habit per day
  UNIQUE(habit_id, check_date)
);

-- Personal Tasks Table (one-off tasks, not recurring habits)
CREATE TABLE IF NOT EXISTS personal_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Task details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Status
  status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'completed', 'cancelled'
  completed_at TIMESTAMP,

  -- Scheduling
  due_date DATE,
  reminder_time TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT check_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT check_status CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled'))
);

-- Personal Metrics Table (for custom tracking)
CREATE TABLE IF NOT EXISTS personal_metrics (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Metric configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50), -- 'kg', 'lbs', 'hours', 'books', etc.
  metric_type VARCHAR(50) DEFAULT 'numeric', -- 'numeric', 'boolean', 'text'

  -- Display
  icon VARCHAR(50),
  color VARCHAR(20),
  chart_type VARCHAR(50) DEFAULT 'line', -- 'line', 'bar', 'area'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personal Metric Entries Table
CREATE TABLE IF NOT EXISTS personal_metric_entries (
  id SERIAL PRIMARY KEY,
  metric_id INTEGER NOT NULL REFERENCES personal_metrics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Entry data
  entry_date DATE NOT NULL,
  value DECIMAL(10,2),
  text_value TEXT,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One entry per metric per day
  UNIQUE(metric_id, entry_date)
);

-- Indexes for performance
CREATE INDEX idx_personal_habits_user ON personal_habits(user_id);
CREATE INDEX idx_personal_habits_workspace ON personal_habits(workspace_id);
CREATE INDEX idx_personal_habits_active ON personal_habits(is_active) WHERE is_active = true;

CREATE INDEX idx_habit_checkins_habit ON personal_habit_checkins(habit_id);
CREATE INDEX idx_habit_checkins_user ON personal_habit_checkins(user_id);
CREATE INDEX idx_habit_checkins_date ON personal_habit_checkins(check_date);
CREATE INDEX idx_habit_checkins_habit_date ON personal_habit_checkins(habit_id, check_date);

CREATE INDEX idx_personal_tasks_user ON personal_tasks(user_id);
CREATE INDEX idx_personal_tasks_workspace ON personal_tasks(workspace_id);
CREATE INDEX idx_personal_tasks_status ON personal_tasks(status);
CREATE INDEX idx_personal_tasks_due_date ON personal_tasks(due_date);

CREATE INDEX idx_personal_metrics_user ON personal_metrics(user_id);
CREATE INDEX idx_personal_metrics_workspace ON personal_metrics(workspace_id);
CREATE INDEX idx_personal_metrics_active ON personal_metrics(is_active) WHERE is_active = true;

CREATE INDEX idx_metric_entries_metric ON personal_metric_entries(metric_id);
CREATE INDEX idx_metric_entries_date ON personal_metric_entries(entry_date);
CREATE INDEX idx_metric_entries_metric_date ON personal_metric_entries(metric_id, entry_date);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_personal_habits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_personal_habits_updated_at
  BEFORE UPDATE ON personal_habits
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();

CREATE TRIGGER trigger_habit_checkins_updated_at
  BEFORE UPDATE ON personal_habit_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();

CREATE TRIGGER trigger_personal_tasks_updated_at
  BEFORE UPDATE ON personal_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();

CREATE TRIGGER trigger_personal_metrics_updated_at
  BEFORE UPDATE ON personal_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();

CREATE TRIGGER trigger_metric_entries_updated_at
  BEFORE UPDATE ON personal_metric_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_habits_updated_at();
