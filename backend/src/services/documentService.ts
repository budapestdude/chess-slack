import pool from '../database/db';
import logger from '../utils/logger';
import {
  Document,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentVersion,
  DocumentCollaborator,
  DocumentComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  PermissionLevel,
  DocumentFavorite,
  DocumentView,
  DocumentSearchResult,
  DocumentWithPermissions,
} from '../types/document';

/**
 * Service for managing documents, wiki pages, and notes.
 * Handles CRUD operations, permissions, versioning, and collaboration.
 */
class DocumentService {
  // ============================================
  // DOCUMENT OPERATIONS
  // ============================================

  /**
   * Create a new document
   */
  async createDocument(
    workspaceId: string,
    data: CreateDocumentRequest,
    createdBy: string
  ): Promise<Document> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the document
      const result = await client.query(
        `INSERT INTO documents (
          workspace_id, parent_id, title, content, content_type, doc_type,
          icon, cover_image_url, is_public, is_template, created_by,
          last_edited_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          workspaceId,
          data.parentId || null,
          data.title,
          data.content || null,
          data.contentType || 'markdown',
          data.docType || 'document',
          data.icon || null,
          data.coverImageUrl || null,
          data.isPublic !== undefined ? data.isPublic : false,
          data.isTemplate !== undefined ? data.isTemplate : false,
          createdBy,
          createdBy,
          JSON.stringify(data.metadata || {}),
        ]
      );

      const document = this.mapRowToDocument(result.rows[0]);

      // Add creator as admin collaborator by default
      await client.query(
        `INSERT INTO document_collaborators (document_id, user_id, permission_level, added_by)
         VALUES ($1, $2, $3, $4)`,
        [document.id, createdBy, 'admin', createdBy]
      );

      // Add additional collaborators if provided
      if (data.collaborators && data.collaborators.length > 0) {
        for (const collab of data.collaborators) {
          if (collab.userId !== createdBy) {
            await client.query(
              `INSERT INTO document_collaborators (document_id, user_id, permission_level, added_by)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (document_id, user_id) DO NOTHING`,
              [document.id, collab.userId, collab.permissionLevel || 'view', createdBy]
            );
          }
        }
      }

      await client.query('COMMIT');

      logger.info('Document created', { documentId: document.id, workspaceId, title: document.title });

      return document;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating document', { error, workspaceId, data });
      throw new Error(`Failed to create document: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM documents WHERE id = $1 AND is_archived = false',
        [documentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Error getting document', { error, documentId });
      throw new Error(`Failed to get document: ${error}`);
    }
  }

  /**
   * Get document with user's permission level
   */
  async getDocumentWithPermissions(
    documentId: string,
    userId: string
  ): Promise<DocumentWithPermissions | null> {
    try {
      const result = await pool.query(
        `SELECT
          d.*,
          dc.permission_level,
          CASE
            WHEN dc.user_id IS NOT NULL OR d.is_public = true OR d.created_by = $2 THEN true
            ELSE false
          END as can_view,
          CASE
            WHEN dc.permission_level IN ('comment', 'edit', 'admin') OR d.created_by = $2 THEN true
            ELSE false
          END as can_comment,
          CASE
            WHEN dc.permission_level IN ('edit', 'admin') OR d.created_by = $2 THEN true
            ELSE false
          END as can_edit,
          CASE
            WHEN dc.permission_level = 'admin' OR d.created_by = $2 THEN true
            ELSE false
          END as can_admin
        FROM documents d
        LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = $2
        WHERE d.id = $1 AND d.is_archived = false`,
        [documentId, userId]
      );

      if (result.rows.length === 0 || !result.rows[0].can_view) {
        return null;
      }

      const row = result.rows[0];
      return {
        document: this.mapRowToDocument(row),
        permissionLevel: row.permission_level || (row.created_by === userId ? 'admin' : null),
        canView: row.can_view,
        canComment: row.can_comment,
        canEdit: row.can_edit,
        canAdmin: row.can_admin,
      };
    } catch (error) {
      logger.error('Error getting document with permissions', { error, documentId, userId });
      throw new Error(`Failed to get document with permissions: ${error}`);
    }
  }

  /**
   * Get all documents in a workspace with optional filtering
   */
  async getWorkspaceDocuments(
    workspaceId: string,
    userId: string,
    filters?: {
      docType?: string;
      parentId?: string;
      includeArchived?: boolean;
    }
  ): Promise<Document[]> {
    try {
      let query = `
        SELECT DISTINCT d.*
        FROM documents d
        LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = $2
        WHERE d.workspace_id = $1
        AND (dc.user_id IS NOT NULL OR d.is_public = true OR d.created_by = $2)
      `;
      const params: any[] = [workspaceId, userId];
      let paramIndex = 3;

      if (!filters?.includeArchived) {
        query += ` AND d.is_archived = false`;
      }

      if (filters?.docType) {
        query += ` AND d.doc_type = $${paramIndex++}`;
        params.push(filters.docType);
      }

      if (filters?.parentId !== undefined) {
        if (filters.parentId === null || filters.parentId === '') {
          query += ` AND d.parent_id IS NULL`;
        } else {
          query += ` AND d.parent_id = $${paramIndex++}`;
          params.push(filters.parentId);
        }
      }

      query += ' ORDER BY d.created_at DESC';

      const result = await pool.query(query, params);
      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      logger.error('Error getting workspace documents', { error, workspaceId, filters });
      throw new Error(`Failed to get workspace documents: ${error}`);
    }
  }

  /**
   * Get child documents (for folders)
   */
  async getChildDocuments(parentId: string, userId: string): Promise<Document[]> {
    try {
      const result = await pool.query(
        `SELECT DISTINCT d.*
         FROM documents d
         LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = $2
         WHERE d.parent_id = $1
         AND (dc.user_id IS NOT NULL OR d.is_public = true OR d.created_by = $2)
         AND d.is_archived = false
         ORDER BY d.created_at DESC`,
        [parentId, userId]
      );

      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      logger.error('Error getting child documents', { error, parentId });
      throw new Error(`Failed to get child documents: ${error}`);
    }
  }

  /**
   * Update a document
   */
  async updateDocument(
    documentId: string,
    updates: UpdateDocumentRequest,
    userId: string
  ): Promise<Document> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }
      if (updates.content !== undefined) {
        fields.push(`content = $${paramIndex++}`);
        values.push(updates.content);
      }
      if (updates.contentType !== undefined) {
        fields.push(`content_type = $${paramIndex++}`);
        values.push(updates.contentType);
      }
      if (updates.docType !== undefined) {
        fields.push(`doc_type = $${paramIndex++}`);
        values.push(updates.docType);
      }
      if (updates.parentId !== undefined) {
        fields.push(`parent_id = $${paramIndex++}`);
        values.push(updates.parentId);
      }
      if (updates.icon !== undefined) {
        fields.push(`icon = $${paramIndex++}`);
        values.push(updates.icon);
      }
      if (updates.coverImageUrl !== undefined) {
        fields.push(`cover_image_url = $${paramIndex++}`);
        values.push(updates.coverImageUrl);
      }
      if (updates.isPublic !== undefined) {
        fields.push(`is_public = $${paramIndex++}`);
        values.push(updates.isPublic);
      }
      if (updates.isTemplate !== undefined) {
        fields.push(`is_template = $${paramIndex++}`);
        values.push(updates.isTemplate);
      }
      if (updates.metadata !== undefined) {
        fields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      // Always update last_edited_by
      fields.push(`last_edited_by = $${paramIndex++}`);
      values.push(userId);

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(documentId);
      const query = `
        UPDATE documents
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      await client.query('COMMIT');

      const document = this.mapRowToDocument(result.rows[0]);
      logger.info('Document updated', { documentId, updates });

      return document;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating document', { error, documentId, updates });
      throw new Error(`Failed to update document: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Archive a document
   */
  async archiveDocument(documentId: string): Promise<void> {
    try {
      const result = await pool.query(
        `UPDATE documents
         SET is_archived = true, archived_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [documentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      logger.info('Document archived', { documentId });
    } catch (error) {
      logger.error('Error archiving document', { error, documentId });
      throw new Error(`Failed to archive document: ${error}`);
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM documents WHERE id = $1 RETURNING id',
        [documentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      await client.query('COMMIT');
      logger.info('Document deleted', { documentId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting document', { error, documentId });
      throw new Error(`Failed to delete document: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Move document to a different parent
   */
  async moveDocument(documentId: string, newParentId: string | null): Promise<Document> {
    try {
      const result = await pool.query(
        `UPDATE documents
         SET parent_id = $1
         WHERE id = $2
         RETURNING *`,
        [newParentId, documentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      logger.info('Document moved', { documentId, newParentId });
      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Error moving document', { error, documentId, newParentId });
      throw new Error(`Failed to move document: ${error}`);
    }
  }

  // ============================================
  // PERMISSION OPERATIONS
  // ============================================

  /**
   * Check if user can view document
   */
  async canView(documentId: string, userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM documents d
         LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = $2
         WHERE d.id = $1
         AND (dc.user_id IS NOT NULL OR d.is_public = true OR d.created_by = $2)`,
        [documentId, userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking view permission', { error, documentId, userId });
      return false;
    }
  }

  /**
   * Check if user can comment on document
   */
  async canComment(documentId: string, userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM documents d
         LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = $2
         WHERE d.id = $1
         AND (dc.permission_level IN ('comment', 'edit', 'admin') OR d.created_by = $2)`,
        [documentId, userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking comment permission', { error, documentId, userId });
      return false;
    }
  }

  /**
   * Check if user can edit document
   */
  async canEdit(documentId: string, userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM documents d
         LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = $2
         WHERE d.id = $1
         AND (dc.permission_level IN ('edit', 'admin') OR d.created_by = $2)`,
        [documentId, userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking edit permission', { error, documentId, userId });
      return false;
    }
  }

  /**
   * Check if user has admin permission on document
   */
  async isAdmin(documentId: string, userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM documents d
         LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = $2
         WHERE d.id = $1
         AND (dc.permission_level = 'admin' OR d.created_by = $2)`,
        [documentId, userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking admin permission', { error, documentId, userId });
      return false;
    }
  }

  // ============================================
  // VERSION OPERATIONS
  // ============================================

  /**
   * Get all versions of a document
   */
  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM document_versions
         WHERE document_id = $1
         ORDER BY version_number DESC`,
        [documentId]
      );

      return result.rows.map(row => this.mapRowToVersion(row));
    } catch (error) {
      logger.error('Error getting document versions', { error, documentId });
      throw new Error(`Failed to get document versions: ${error}`);
    }
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(
    documentId: string,
    versionNumber: number,
    userId: string
  ): Promise<Document> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the version
      const versionResult = await client.query(
        `SELECT * FROM document_versions
         WHERE document_id = $1 AND version_number = $2`,
        [documentId, versionNumber]
      );

      if (versionResult.rows.length === 0) {
        throw new Error('Version not found');
      }

      const version = versionResult.rows[0];

      // Update the document with version content
      const result = await client.query(
        `UPDATE documents
         SET title = $1, content = $2, content_type = $3, last_edited_by = $4
         WHERE id = $5
         RETURNING *`,
        [version.title, version.content, version.content_type, userId, documentId]
      );

      await client.query('COMMIT');

      logger.info('Document version restored', { documentId, versionNumber });
      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error restoring document version', { error, documentId, versionNumber });
      throw new Error(`Failed to restore document version: ${error}`);
    } finally {
      client.release();
    }
  }

  // ============================================
  // COLLABORATOR OPERATIONS
  // ============================================

  /**
   * Add a collaborator to a document
   */
  async addCollaborator(
    documentId: string,
    userId: string,
    permissionLevel: PermissionLevel,
    addedBy: string
  ): Promise<DocumentCollaborator> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO document_collaborators (document_id, user_id, permission_level, added_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (document_id, user_id)
         DO UPDATE SET permission_level = $3, added_by = $4
         RETURNING *`,
        [documentId, userId, permissionLevel, addedBy]
      );

      await client.query('COMMIT');

      const collaborator = this.mapRowToCollaborator(result.rows[0]);
      logger.info('Collaborator added', { documentId, userId, permissionLevel });

      return collaborator;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding collaborator', { error, documentId, userId });
      throw new Error(`Failed to add collaborator: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update collaborator permission
   */
  async updateCollaboratorPermission(
    documentId: string,
    userId: string,
    permissionLevel: PermissionLevel
  ): Promise<DocumentCollaborator> {
    try {
      const result = await pool.query(
        `UPDATE document_collaborators
         SET permission_level = $1
         WHERE document_id = $2 AND user_id = $3
         RETURNING *`,
        [permissionLevel, documentId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Collaborator not found');
      }

      logger.info('Collaborator permission updated', { documentId, userId, permissionLevel });
      return this.mapRowToCollaborator(result.rows[0]);
    } catch (error) {
      logger.error('Error updating collaborator permission', { error, documentId, userId });
      throw new Error(`Failed to update collaborator permission: ${error}`);
    }
  }

  /**
   * Remove a collaborator
   */
  async removeCollaborator(documentId: string, userId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM document_collaborators WHERE document_id = $1 AND user_id = $2 RETURNING id',
        [documentId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Collaborator not found');
      }

      logger.info('Collaborator removed', { documentId, userId });
    } catch (error) {
      logger.error('Error removing collaborator', { error, documentId, userId });
      throw new Error(`Failed to remove collaborator: ${error}`);
    }
  }

  /**
   * Get all collaborators for a document
   */
  async getCollaborators(documentId: string): Promise<DocumentCollaborator[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM document_collaborators
         WHERE document_id = $1
         ORDER BY added_at ASC`,
        [documentId]
      );

      return result.rows.map(row => this.mapRowToCollaborator(row));
    } catch (error) {
      logger.error('Error getting collaborators', { error, documentId });
      throw new Error(`Failed to get collaborators: ${error}`);
    }
  }

  // ============================================
  // COMMENT OPERATIONS
  // ============================================

  /**
   * Add a comment to a document
   */
  async addComment(
    documentId: string,
    userId: string,
    data: CreateCommentRequest
  ): Promise<DocumentComment> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO document_comments (
          document_id, user_id, content, parent_comment_id,
          selection_start, selection_end, selection_text
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          documentId,
          userId,
          data.content,
          data.parentCommentId || null,
          data.selectionStart || null,
          data.selectionEnd || null,
          data.selectionText || null,
        ]
      );

      await client.query('COMMIT');

      const comment = this.mapRowToComment(result.rows[0]);
      logger.info('Comment added', { documentId, commentId: comment.id });

      return comment;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error adding comment', { error, documentId, data });
      throw new Error(`Failed to add comment: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    updates: UpdateCommentRequest
  ): Promise<DocumentComment> {
    try {
      const result = await pool.query(
        `UPDATE document_comments
         SET content = $1
         WHERE id = $2
         RETURNING *`,
        [updates.content, commentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Comment not found');
      }

      logger.info('Comment updated', { commentId });
      return this.mapRowToComment(result.rows[0]);
    } catch (error) {
      logger.error('Error updating comment', { error, commentId, updates });
      throw new Error(`Failed to update comment: ${error}`);
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM document_comments WHERE id = $1 RETURNING id',
        [commentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Comment not found');
      }

      logger.info('Comment deleted', { commentId });
    } catch (error) {
      logger.error('Error deleting comment', { error, commentId });
      throw new Error(`Failed to delete comment: ${error}`);
    }
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, userId: string): Promise<DocumentComment> {
    try {
      const result = await pool.query(
        `UPDATE document_comments
         SET is_resolved = true, resolved_by = $1, resolved_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [userId, commentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Comment not found');
      }

      logger.info('Comment resolved', { commentId, userId });
      return this.mapRowToComment(result.rows[0]);
    } catch (error) {
      logger.error('Error resolving comment', { error, commentId, userId });
      throw new Error(`Failed to resolve comment: ${error}`);
    }
  }

  /**
   * Get all comments for a document
   */
  async getComments(documentId: string): Promise<DocumentComment[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM document_comments
         WHERE document_id = $1
         ORDER BY created_at ASC`,
        [documentId]
      );

      return result.rows.map(row => this.mapRowToComment(row));
    } catch (error) {
      logger.error('Error getting comments', { error, documentId });
      throw new Error(`Failed to get comments: ${error}`);
    }
  }

  // ============================================
  // SEARCH OPERATIONS
  // ============================================

  /**
   * Search documents using full-text search
   */
  async searchDocuments(
    workspaceId: string,
    query: string,
    limit: number = 50
  ): Promise<DocumentSearchResult[]> {
    try {
      // Sanitize the search query to use tsquery format
      const sanitizedQuery = query
        .trim()
        .split(/\s+/)
        .map(word => `${word}:*`)
        .join(' & ');

      const result = await pool.query(
        'SELECT * FROM search_documents($1, $2, $3)',
        [workspaceId, sanitizedQuery, limit]
      );

      return result.rows.map(row => ({
        documentId: row.document_id,
        title: row.title,
        contentPreview: row.content_preview,
        rank: row.rank,
      }));
    } catch (error) {
      logger.error('Error searching documents', { error, workspaceId, query });
      throw new Error(`Failed to search documents: ${error}`);
    }
  }

  // ============================================
  // FAVORITE OPERATIONS
  // ============================================

  /**
   * Add document to favorites
   */
  async addFavorite(documentId: string, userId: string): Promise<DocumentFavorite> {
    try {
      const result = await pool.query(
        `INSERT INTO document_favorites (document_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (document_id, user_id) DO NOTHING
         RETURNING *`,
        [documentId, userId]
      );

      if (result.rows.length === 0) {
        // Already favorited, fetch existing
        const existing = await pool.query(
          'SELECT * FROM document_favorites WHERE document_id = $1 AND user_id = $2',
          [documentId, userId]
        );
        return this.mapRowToFavorite(existing.rows[0]);
      }

      logger.info('Document favorited', { documentId, userId });
      return this.mapRowToFavorite(result.rows[0]);
    } catch (error) {
      logger.error('Error adding favorite', { error, documentId, userId });
      throw new Error(`Failed to add favorite: ${error}`);
    }
  }

  /**
   * Remove document from favorites
   */
  async removeFavorite(documentId: string, userId: string): Promise<void> {
    try {
      await pool.query(
        'DELETE FROM document_favorites WHERE document_id = $1 AND user_id = $2',
        [documentId, userId]
      );

      logger.info('Document unfavorited', { documentId, userId });
    } catch (error) {
      logger.error('Error removing favorite', { error, documentId, userId });
      throw new Error(`Failed to remove favorite: ${error}`);
    }
  }

  /**
   * Get user's favorite documents
   */
  async getFavorites(workspaceId: string, userId: string): Promise<Document[]> {
    try {
      const result = await pool.query(
        `SELECT d.* FROM documents d
         INNER JOIN document_favorites df ON d.id = df.document_id
         WHERE d.workspace_id = $1 AND df.user_id = $2 AND d.is_archived = false
         ORDER BY df.created_at DESC`,
        [workspaceId, userId]
      );

      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      logger.error('Error getting favorites', { error, workspaceId, userId });
      throw new Error(`Failed to get favorites: ${error}`);
    }
  }

  /**
   * Check if document is favorited by user
   */
  async isFavorited(documentId: string, userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT 1 FROM document_favorites WHERE document_id = $1 AND user_id = $2',
        [documentId, userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking favorite status', { error, documentId, userId });
      return false;
    }
  }

  // ============================================
  // VIEW TRACKING
  // ============================================

  /**
   * Record a document view
   */
  async recordView(
    documentId: string,
    userId: string,
    durationSeconds?: number
  ): Promise<DocumentView> {
    try {
      const result = await pool.query(
        `INSERT INTO document_views (document_id, user_id, duration_seconds)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [documentId, userId, durationSeconds || null]
      );

      return this.mapRowToView(result.rows[0]);
    } catch (error) {
      logger.error('Error recording document view', { error, documentId, userId });
      throw new Error(`Failed to record document view: ${error}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map database row to Document
   */
  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      parentId: row.parent_id,
      title: row.title,
      content: row.content,
      contentType: row.content_type,
      docType: row.doc_type,
      icon: row.icon,
      coverImageUrl: row.cover_image_url,
      isPublic: row.is_public,
      isArchived: row.is_archived,
      isTemplate: row.is_template,
      createdBy: row.created_by,
      lastEditedBy: row.last_edited_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      archivedAt: row.archived_at ? new Date(row.archived_at) : null,
      metadata: row.metadata || {},
    };
  }

  /**
   * Map database row to DocumentVersion
   */
  private mapRowToVersion(row: any): DocumentVersion {
    return {
      id: row.id,
      documentId: row.document_id,
      versionNumber: row.version_number,
      title: row.title,
      content: row.content,
      contentType: row.content_type,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      changeSummary: row.change_summary,
    };
  }

  /**
   * Map database row to DocumentCollaborator
   */
  private mapRowToCollaborator(row: any): DocumentCollaborator {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      permissionLevel: row.permission_level as PermissionLevel,
      addedBy: row.added_by,
      addedAt: new Date(row.added_at),
    };
  }

  /**
   * Map database row to DocumentComment
   */
  private mapRowToComment(row: any): DocumentComment {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      content: row.content,
      parentCommentId: row.parent_comment_id,
      selectionStart: row.selection_start,
      selectionEnd: row.selection_end,
      selectionText: row.selection_text,
      isResolved: row.is_resolved,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to DocumentFavorite
   */
  private mapRowToFavorite(row: any): DocumentFavorite {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Map database row to DocumentView
   */
  private mapRowToView(row: any): DocumentView {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      viewedAt: new Date(row.viewed_at),
      durationSeconds: row.duration_seconds,
    };
  }
}

export default new DocumentService();
