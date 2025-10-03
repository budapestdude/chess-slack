// Personal Task Tracker Types

export interface PersonalHabit {
  id: number;
  user_id: number;
  workspace_id: number;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  target_type: 'boolean' | 'numeric' | 'duration';
  target_value?: number;
  target_unit?: string;
  frequency: 'daily' | 'weekly' | 'custom';
  frequency_days?: number[];
  is_active: boolean;
  archived_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PersonalHabitCheckin {
  id: number;
  habit_id: number;
  user_id: number;
  check_date: Date;
  value?: number;
  completed: boolean;
  notes?: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
  created_at: Date;
  updated_at: Date;
}

export interface PersonalTask {
  id: number;
  user_id: number;
  workspace_id: number;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: Date;
  due_date?: Date;
  reminder_time?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PersonalMetric {
  id: number;
  user_id: number;
  workspace_id: number;
  name: string;
  description?: string;
  unit?: string;
  metric_type: 'numeric' | 'boolean' | 'text';
  icon?: string;
  color?: string;
  chart_type: 'line' | 'bar' | 'area';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PersonalMetricEntry {
  id: number;
  metric_id: number;
  user_id: number;
  entry_date: Date;
  value?: number;
  text_value?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Request types
export interface CreateHabitRequest {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  target_type: 'boolean' | 'numeric' | 'duration';
  target_value?: number;
  target_unit?: string;
  frequency?: 'daily' | 'weekly' | 'custom';
  frequency_days?: number[];
}

export interface UpdateHabitRequest extends Partial<CreateHabitRequest> {
  is_active?: boolean;
}

export interface CreateCheckinRequest {
  habit_id: number;
  check_date?: string; // ISO date string
  value?: number;
  completed?: boolean;
  notes?: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
}

export interface CreatePersonalTaskRequest {
  title: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  reminder_time?: string;
}

export interface UpdatePersonalTaskRequest extends Partial<CreatePersonalTaskRequest> {}

export interface CreateMetricRequest {
  name: string;
  description?: string;
  unit?: string;
  metric_type?: 'numeric' | 'boolean' | 'text';
  icon?: string;
  color?: string;
  chart_type?: 'line' | 'bar' | 'area';
}

export interface UpdateMetricRequest extends Partial<CreateMetricRequest> {
  is_active?: boolean;
}

export interface CreateMetricEntryRequest {
  metric_id: number;
  entry_date?: string;
  value?: number;
  text_value?: string;
  notes?: string;
}

// Response types
export interface HabitWithStats extends PersonalHabit {
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  completion_rate: number;
  last_checkin?: PersonalHabitCheckin;
}

export interface HabitStats {
  habit_id: number;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  completion_rate: number;
  this_week_count: number;
  this_month_count: number;
}

export interface PersonalDashboardStats {
  total_habits: number;
  active_habits: number;
  today_completed: number;
  today_pending: number;
  current_streaks: { habit_id: number; habit_name: string; streak: number }[];
  upcoming_tasks: PersonalTask[];
  recent_metrics: PersonalMetricEntry[];
}
