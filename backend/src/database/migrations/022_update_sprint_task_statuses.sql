-- Migration: Update Sprint Task Statuses for Customer Relationship Tracking
-- Description: Update task statuses from standard kanban (todo/in_progress/review/completed)
--              to customer relationship stages (assets/onboarded/negotiating/no_response)

-- Update existing tasks to map to new statuses
UPDATE sprint_tasks
SET status = CASE
  WHEN status = 'todo' THEN 'assets'
  WHEN status = 'in_progress' THEN 'negotiating'
  WHEN status = 'review' THEN 'negotiating'
  WHEN status = 'completed' THEN 'onboarded'
  ELSE 'assets'
END;

-- Update default status value
ALTER TABLE sprint_tasks
ALTER COLUMN status SET DEFAULT 'assets';

-- Add comment explaining the status values
COMMENT ON COLUMN sprint_tasks.status IS 'Customer relationship status: assets (initial resources/contacts), onboarded (successful conversion), negotiating (active discussions), no_response (inactive/no reply)';
