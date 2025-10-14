import api from './api';

// ============ TYPES ============

export interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  completed: boolean;
}

export interface MeetingNote {
  id: string;
  workspace_id: string;
  title: string;
  date: string;
  attendees: string[];
  agenda: string[];
  notes: string;
  action_items: ActionItem[];
  template: string;
  created_by: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingNoteData {
  title: string;
  date: string;
  attendees?: string[];
  agenda?: string[];
  notes?: string;
  actionItems?: ActionItem[];
  template?: string;
}

export interface UpdateMeetingNoteData {
  title?: string;
  date?: string;
  attendees?: string[];
  agenda?: string[];
  notes?: string;
  actionItems?: ActionItem[];
  template?: string;
}

// ============ API FUNCTIONS ============

export const getMeetingNotes = async (workspaceId: string): Promise<MeetingNote[]> => {
  const response = await api.get(`/workspaces/${workspaceId}/meeting-notes`);
  return response.data.notes;
};

export const getMeetingNote = async (workspaceId: string, noteId: string): Promise<MeetingNote> => {
  const response = await api.get(`/workspaces/${workspaceId}/meeting-notes/${noteId}`);
  return response.data;
};

export const createMeetingNote = async (
  workspaceId: string,
  data: CreateMeetingNoteData
): Promise<MeetingNote> => {
  const response = await api.post(`/workspaces/${workspaceId}/meeting-notes`, data);
  return response.data;
};

export const updateMeetingNote = async (
  workspaceId: string,
  noteId: string,
  data: UpdateMeetingNoteData
): Promise<MeetingNote> => {
  const response = await api.put(`/workspaces/${workspaceId}/meeting-notes/${noteId}`, data);
  return response.data;
};

export const deleteMeetingNote = async (workspaceId: string, noteId: string): Promise<void> => {
  await api.delete(`/workspaces/${workspaceId}/meeting-notes/${noteId}`);
};
