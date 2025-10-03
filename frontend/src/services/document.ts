/**
 * Document Service
 * Handles all API interactions for documents, wikis, and notes
 */

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  type: 'document' | 'wiki' | 'note';
  icon?: string;
  coverImage?: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string;
  isFavorite: boolean;
  isArchived: boolean;
  collaborators: Collaborator[];
  permissions: 'view' | 'comment' | 'edit' | 'admin';
}

export interface Collaborator {
  userId: string;
  permission: 'view' | 'comment' | 'edit' | 'admin';
  addedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  parentId?: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  replies?: Comment[];
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  title: string;
  editedBy: string;
  createdAt: string;
  changeSummary?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface CreateDocumentData {
  title: string;
  content?: string;
  type: 'document' | 'wiki' | 'note';
  icon?: string;
  coverImage?: string;
  parentId?: string;
}

export interface UpdateDocumentData extends Partial<CreateDocumentData> {}

export interface DocumentTreeNode {
  id: string;
  title: string;
  type: 'document' | 'wiki' | 'note' | 'folder';
  icon?: string;
  isFavorite: boolean;
  parentId?: string;
  children?: DocumentTreeNode[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get authentication headers
 */
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

/**
 * List all documents in a workspace
 */
export const getDocuments = async (
  workspaceId: string,
  filters?: {
    type?: 'document' | 'wiki' | 'note';
    favorites?: boolean;
    archived?: boolean;
  }
): Promise<Document[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.favorites !== undefined) params.append('favorites', String(filters.favorites));
    if (filters?.archived !== undefined) params.append('archived', String(filters.archived));

    const queryString = params.toString();
    const url = `${API_BASE}/workspaces/${workspaceId}/documents${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    const data = await response.json();
    return data.documents || data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Get document tree structure
 */
export const getDocumentTree = async (
  workspaceId: string
): Promise<DocumentTreeNode[]> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/tree`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch document tree: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching document tree:', error);
    throw error;
  }
};

/**
 * Get a single document by ID
 */
export const getDocument = async (
  workspaceId: string,
  documentId: string
): Promise<Document> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching document:', error);
    throw error;
  }
};

/**
 * Create a new document
 */
export const createDocument = async (
  workspaceId: string,
  data: CreateDocumentData
): Promise<Document> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create document: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

/**
 * Update an existing document
 */
export const updateDocument = async (
  workspaceId: string,
  documentId: string,
  data: UpdateDocumentData
): Promise<Document> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update document: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (
  workspaceId: string,
  documentId: string
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Archive a document
 */
export const archiveDocument = async (
  workspaceId: string,
  documentId: string
): Promise<Document> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/archive`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to archive document: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error archiving document:', error);
    throw error;
  }
};

/**
 * Search documents
 */
export const searchDocuments = async (
  workspaceId: string,
  query: string
): Promise<Document[]> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search documents: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (
  workspaceId: string,
  documentId: string
): Promise<Document> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/favorite`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to toggle favorite: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
};

// ============================================================================
// Version History
// ============================================================================

/**
 * Get version history for a document
 */
export const getVersionHistory = async (
  workspaceId: string,
  documentId: string
): Promise<DocumentVersion[]> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/versions`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch version history: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching version history:', error);
    throw error;
  }
};

/**
 * Restore a specific version
 */
export const restoreVersion = async (
  workspaceId: string,
  documentId: string,
  versionId: string
): Promise<Document> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}/restore`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to restore version: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error restoring version:', error);
    throw error;
  }
};

// ============================================================================
// Collaborators
// ============================================================================

/**
 * Add a collaborator to a document
 */
export const addCollaborator = async (
  workspaceId: string,
  documentId: string,
  userId: string,
  permission: 'view' | 'comment' | 'edit' | 'admin'
): Promise<Collaborator> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/collaborators`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, permission }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add collaborator: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding collaborator:', error);
    throw error;
  }
};

/**
 * Update collaborator permission
 */
export const updateCollaboratorPermission = async (
  workspaceId: string,
  documentId: string,
  userId: string,
  permission: 'view' | 'comment' | 'edit' | 'admin'
): Promise<Collaborator> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/collaborators/${userId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ permission }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update permission: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating permission:', error);
    throw error;
  }
};

/**
 * Remove a collaborator
 */
export const removeCollaborator = async (
  workspaceId: string,
  documentId: string,
  userId: string
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/collaborators/${userId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to remove collaborator: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error removing collaborator:', error);
    throw error;
  }
};

// ============================================================================
// Comments
// ============================================================================

/**
 * Get comments for a document
 */
export const getComments = async (
  workspaceId: string,
  documentId: string
): Promise<Comment[]> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/comments`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

/**
 * Add a comment to a document
 */
export const addComment = async (
  workspaceId: string,
  documentId: string,
  content: string,
  parentId?: string
): Promise<Comment> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/comments`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content, parentId }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Update a comment
 */
export const updateComment = async (
  workspaceId: string,
  documentId: string,
  commentId: string,
  content: string
): Promise<Comment> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update comment: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (
  workspaceId: string,
  documentId: string,
  commentId: string
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

/**
 * Resolve/unresolve a comment
 */
export const toggleResolveComment = async (
  workspaceId: string,
  documentId: string,
  commentId: string
): Promise<Comment> => {
  try {
    const response = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/documents/${documentId}/comments/${commentId}/resolve`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to resolve comment: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error resolving comment:', error);
    throw error;
  }
};
