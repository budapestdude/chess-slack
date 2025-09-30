import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  status_text: string | null;
  timezone: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: Date;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  topic: string | null;
  is_private: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'admin' | 'member';
  notifications_enabled: boolean;
  joined_at: Date;
  last_read_at: Date;
}

export interface Message {
  id: string;
  workspace_id: string;
  channel_id: string | null;
  dm_group_id: string | null;
  user_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system' | 'chess_game';
  metadata: Record<string, any>;
  parent_message_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}