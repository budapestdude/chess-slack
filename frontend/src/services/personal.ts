import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  current_streak?: number;
  longest_streak?: number;
  total_checkins?: number;
  completion_rate?: number;
  last_checkin?: PersonalHabitCheckin;
}

export interface PersonalHabitCheckin {
  id: number;
  habit_id: number;
  user_id: number;
  check_date: string;
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
  due_date?: string;
  reminder_time?: Date;
  created_at: Date;
  updated_at: Date;
}

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

export interface CreateCheckinRequest {
  habit_id: number;
  check_date?: string;
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

export interface PersonalDashboardStats {
  total_habits: number;
  active_habits: number;
  today_completed: number;
  today_pending: number;
  upcoming_tasks: PersonalTask[];
}

export interface DailyChecklistItem {
  id: number;
  user_id: string;
  workspace_id: number;
  content: string;
  completed: boolean;
  completed_at?: Date;
  task_date: string;
  sort_order: number;
  recurring_task_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RecurringTask {
  id: number;
  user_id: string;
  workspace_id: number;
  content: string;
  frequency: 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'custom';
  frequency_days?: number[];
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: Date;
  updated_at: Date;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Habit API
export const createHabit = async (workspaceId: number, data: CreateHabitRequest): Promise<PersonalHabit> => {
  const response = await axios.post(`${API_URL}/api/personal/${workspaceId}/habits`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getHabits = async (workspaceId: number, includeArchived = false): Promise<PersonalHabit[]> => {
  const response = await axios.get(`${API_URL}/api/personal/${workspaceId}/habits`, {
    params: { includeArchived },
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getHabit = async (workspaceId: number, habitId: number): Promise<PersonalHabit> => {
  const response = await axios.get(`${API_URL}/api/personal/${workspaceId}/habits/${habitId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateHabit = async (
  workspaceId: number,
  habitId: number,
  data: Partial<CreateHabitRequest>
): Promise<PersonalHabit> => {
  const response = await axios.put(`${API_URL}/api/personal/${workspaceId}/habits/${habitId}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deleteHabit = async (workspaceId: number, habitId: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/personal/${workspaceId}/habits/${habitId}`, {
    headers: getAuthHeaders(),
  });
};

// Check-in API
export const createCheckin = async (
  workspaceId: number,
  data: CreateCheckinRequest
): Promise<PersonalHabitCheckin> => {
  const response = await axios.post(`${API_URL}/api/personal/${workspaceId}/checkins`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getCheckins = async (
  workspaceId: number,
  habitId: number,
  startDate?: string,
  endDate?: string
): Promise<PersonalHabitCheckin[]> => {
  const response = await axios.get(`${API_URL}/api/personal/${workspaceId}/habits/${habitId}/checkins`, {
    params: { startDate, endDate },
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Personal Task API
export const createPersonalTask = async (
  workspaceId: number,
  data: CreatePersonalTaskRequest
): Promise<PersonalTask> => {
  const response = await axios.post(`${API_URL}/api/personal/${workspaceId}/tasks`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getPersonalTasks = async (workspaceId: number, status?: string): Promise<PersonalTask[]> => {
  const response = await axios.get(`${API_URL}/api/personal/${workspaceId}/tasks`, {
    params: { status },
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updatePersonalTask = async (
  workspaceId: number,
  taskId: number,
  data: Partial<CreatePersonalTaskRequest>
): Promise<PersonalTask> => {
  const response = await axios.put(`${API_URL}/api/personal/${workspaceId}/tasks/${taskId}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deletePersonalTask = async (workspaceId: number, taskId: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/personal/${workspaceId}/tasks/${taskId}`, {
    headers: getAuthHeaders(),
  });
};

// Dashboard Stats
export const getDashboardStats = async (workspaceId: number): Promise<PersonalDashboardStats> => {
  const response = await axios.get(`${API_URL}/api/personal/${workspaceId}/stats`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Daily Checklist API
export const getDailyChecklist = async (
  workspaceId: number,
  date?: string
): Promise<DailyChecklistItem[]> => {
  const response = await axios.get(`${API_URL}/api/personal/${workspaceId}/checklist`, {
    params: { date },
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const bulkCreateChecklistItems = async (
  workspaceId: number,
  items: string[],
  date?: string
): Promise<DailyChecklistItem[]> => {
  const response = await axios.post(
    `${API_URL}/api/personal/${workspaceId}/checklist/bulk`,
    { items, date },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const toggleChecklistItem = async (
  workspaceId: number,
  itemId: number
): Promise<DailyChecklistItem> => {
  const response = await axios.post(
    `${API_URL}/api/personal/${workspaceId}/checklist/${itemId}/toggle`,
    {},
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteChecklistItem = async (workspaceId: number, itemId: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/personal/${workspaceId}/checklist/${itemId}`, {
    headers: getAuthHeaders(),
  });
};

export const clearCompletedChecklistItems = async (
  workspaceId: number,
  date?: string
): Promise<void> => {
  await axios.delete(`${API_URL}/api/personal/${workspaceId}/checklist/completed/clear`, {
    params: { date },
    headers: getAuthHeaders(),
  });
};

// Recurring Tasks API
export const getRecurringTasks = async (workspaceId: number): Promise<RecurringTask[]> => {
  const response = await axios.get(`${API_URL}/api/personal/${workspaceId}/recurring`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createRecurringTask = async (
  workspaceId: number,
  data: {
    content: string;
    frequency: 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'custom';
    frequency_days?: number[];
    start_date?: string;
    end_date?: string;
  }
): Promise<RecurringTask> => {
  const response = await axios.post(`${API_URL}/api/personal/${workspaceId}/recurring`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateRecurringTask = async (
  workspaceId: number,
  taskId: number,
  data: Partial<RecurringTask>
): Promise<RecurringTask> => {
  const response = await axios.put(
    `${API_URL}/api/personal/${workspaceId}/recurring/${taskId}`,
    data,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteRecurringTask = async (workspaceId: number, taskId: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/personal/${workspaceId}/recurring/${taskId}`, {
    headers: getAuthHeaders(),
  });
};

export const generateRecurringTasks = async (
  workspaceId: number,
  date?: string
): Promise<{ message: string; count: number; items: DailyChecklistItem[] }> => {
  const response = await axios.post(
    `${API_URL}/api/personal/${workspaceId}/recurring/generate`,
    { date },
    { headers: getAuthHeaders() }
  );
  return response.data;
};
