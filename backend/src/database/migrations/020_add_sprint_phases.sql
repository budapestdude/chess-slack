-- Add Sprint Phases
-- Organize tasks within sprints into distinct phases

-- Sprint Phases table
CREATE TABLE sprint_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES marketing_sprints(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phase_order INT NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed
    color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sprint_id, phase_order)
);

-- Add phase_id to sprint_tasks
ALTER TABLE sprint_tasks
ADD COLUMN phase_id UUID REFERENCES sprint_phases(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_sprint_phases_sprint ON sprint_phases(sprint_id);
CREATE INDEX idx_sprint_phases_order ON sprint_phases(sprint_id, phase_order);
CREATE INDEX idx_sprint_tasks_phase ON sprint_tasks(phase_id);

-- Add updated_at trigger
CREATE TRIGGER update_sprint_phases_updated_at
BEFORE UPDATE ON sprint_phases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE sprint_phases IS 'Phases within marketing sprints for organizing tasks';
COMMENT ON COLUMN sprint_phases.phase_order IS 'Order of phases within the sprint (1, 2, 3, etc.)';
COMMENT ON COLUMN sprint_phases.color IS 'Color scheme for visual distinction (blue, green, purple, orange, pink)';
