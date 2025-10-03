// Document Types
// Types for the Document and Wiki Management System

// ============================================
// DOCUMENTS
// ============================================

export type DocumentType = 'document' | 'wiki' | 'note' | 'folder';
export type PermissionLevel = 'view' | 'comment' | 'edit' | 'admin';

export interface Document {
  id: string;
  workspaceId: string;
  parentId?: string | null;
  title: string;
  content?: string | null;
  contentType: string;
  docType: DocumentType;
  icon?: string | null;
  coverImageUrl?: string | null;
  isPublic: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  createdBy: string;
  lastEditedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  metadata: Record<string, any>;
}

export interface CreateDocumentRequest {
  title: string;
  content?: string;
  contentType?: string;
  docType?: DocumentType;
  parentId?: string;
  icon?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
  metadata?: Record<string, any>;
  collaborators?: Array<{
    userId: string;
    permissionLevel: PermissionLevel;
  }>;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  contentType?: string;
  docType?: DocumentType;
  parentId?: string;
  icon?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
  metadata?: Record<string, any>;
}

// ============================================
// DOCUMENT VERSIONS
// ============================================

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  content: string;
  contentType: string;
  createdBy: string;
  createdAt: Date;
  changeSummary?: string | null;
}

// ============================================
// DOCUMENT COLLABORATORS
// ============================================

export interface DocumentCollaborator {
  id: string;
  documentId: string;
  userId: string;
  permissionLevel: PermissionLevel;
  addedBy?: string | null;
  addedAt: Date;
}

export interface AddCollaboratorRequest {
  userId: string;
  permissionLevel?: PermissionLevel;
}

export interface UpdateCollaboratorRequest {
  permissionLevel: PermissionLevel;
}

// ============================================
// DOCUMENT COMMENTS
// ============================================

export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  selectionText?: string | null;
  isResolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
  selectionStart?: number;
  selectionEnd?: number;
  selectionText?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

// ============================================
// DOCUMENT LINKS
// ============================================

export type LinkType = 'reference' | 'related' | 'parent' | 'child';

export interface DocumentLink {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  linkType: LinkType;
  createdBy?: string | null;
  createdAt: Date;
}

// ============================================
// DOCUMENT FAVORITES
// ============================================

export interface DocumentFavorite {
  id: string;
  documentId: string;
  userId: string;
  createdAt: Date;
}

// ============================================
// DOCUMENT VIEWS
// ============================================

export interface DocumentView {
  id: string;
  documentId: string;
  userId: string;
  viewedAt: Date;
  durationSeconds?: number | null;
}

// ============================================
// WIKI CATEGORIES
// ============================================

export interface WikiCategory {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  parentCategoryId?: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SEARCH RESULTS
// ============================================

export interface DocumentSearchResult {
  documentId: string;
  title: string;
  contentPreview: string;
  rank: number;
}

// ============================================
// PERMISSION RESPONSE
// ============================================

export interface DocumentWithPermissions {
  document: Document;
  permissionLevel: PermissionLevel | null;
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
  canAdmin: boolean;
}
