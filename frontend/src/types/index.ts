export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: string;
  statusText?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  topic?: string;
  isPrivate: boolean;
  isArchived: boolean;
  createdBy: string;
  isMember: boolean;
  userRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  workspaceId: string;
  channelId?: string;
  dmGroupId?: string;
  userId: string;
  content: string;
  messageType: 'text' | 'file' | 'system' | 'chess_game';
  metadata: Record<string, any>;
  parentMessageId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  replyCount?: number;
  lastReplyAt?: string;
  reactions?: Reaction[];
  hasAttachments?: boolean;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  messageId: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}