-- Migration 010: Documents and Wiki System
-- This migration adds document management and wiki functionality for knowledge sharing

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES documents(id) ON DELETE CASCADE, -- For folder hierarchy

    title VARCHAR(500) NOT NULL,
    content TEXT, -- Rich text content (HTML or Markdown)
    content_type VARCHAR(50) DEFAULT 'markdown', -- 'markdown', 'html', 'rich_text'

    -- Document metadata
    doc_type VARCHAR(50) DEFAULT 'document', -- 'document', 'wiki', 'note', 'folder'
    icon VARCHAR(50), -- Emoji or icon identifier
    cover_image_url TEXT,

    -- Access control
    is_public BOOLEAN DEFAULT false, -- Public within workspace
    is_archived BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,

    -- Collaboration
    created_by UUID NOT NULL REFERENCES users(id),
    last_edited_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}', -- Custom fields, properties, etc.

    -- Full-text search
    search_vector tsvector
);

-- ============================================
-- DOCUMENT VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,

    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,

    -- Version metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_summary TEXT, -- Description of changes

    -- Ensure unique version numbers per document
    UNIQUE(document_id, version_number)
);

-- ============================================
-- DOCUMENT COLLABORATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    permission_level VARCHAR(50) DEFAULT 'view', -- 'view', 'comment', 'edit', 'admin'
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique collaborator per document
    UNIQUE(document_id, user_id)
);

-- ============================================
-- DOCUMENT COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    -- Comment threading
    parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,

    -- Inline comments (selection range in document)
    selection_start INT, -- Character offset start
    selection_end INT, -- Character offset end
    selection_text TEXT, -- Text that was selected

    -- Status
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DOCUMENT LINKS TABLE (Cross-references)
-- ============================================
CREATE TABLE IF NOT EXISTS document_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    link_type VARCHAR(50) DEFAULT 'reference', -- 'reference', 'related', 'parent', 'child'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique links
    UNIQUE(source_document_id, target_document_id, link_type)
);

-- ============================================
-- DOCUMENT FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique favorite per user
    UNIQUE(document_id, user_id)
);

-- ============================================
-- DOCUMENT VIEWS/ACTIVITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INT -- How long they viewed it
);

-- ============================================
-- WIKI NAMESPACES/CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wiki_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'gray',
    icon VARCHAR(50),
    parent_category_id UUID REFERENCES wiki_categories(id) ON DELETE CASCADE,
    position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(workspace_id, name)
);

-- ============================================
-- DOCUMENT CATEGORY ASSOCIATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES wiki_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(document_id, category_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);

CREATE INDEX IF NOT EXISTS idx_document_collaborators_document_id ON document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_document_collaborators_user_id ON document_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON document_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_is_resolved ON document_comments(is_resolved);

CREATE INDEX IF NOT EXISTS idx_document_links_source ON document_links(source_document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_target ON document_links(target_document_id);

CREATE INDEX IF NOT EXISTS idx_document_favorites_document_id ON document_favorites(document_id);
CREATE INDEX IF NOT EXISTS idx_document_favorites_user_id ON document_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_document_views_document_id ON document_views(document_id);
CREATE INDEX IF NOT EXISTS idx_document_views_user_id ON document_views(user_id);
CREATE INDEX IF NOT EXISTS idx_document_views_viewed_at ON document_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_wiki_categories_workspace_id ON wiki_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wiki_categories_parent_id ON wiki_categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_document_categories_document_id ON document_categories(document_id);
CREATE INDEX IF NOT EXISTS idx_document_categories_category_id ON document_categories(category_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_comments_updated_at ON document_comments;
CREATE TRIGGER update_document_comments_updated_at
    BEFORE UPDATE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wiki_categories_updated_at ON wiki_categories;
CREATE TRIGGER update_wiki_categories_updated_at
    BEFORE UPDATE ON wiki_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGERS FOR VERSIONING
-- ============================================
-- Automatically create version when document is updated
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INT;
BEGIN
    -- Only create version if content changed
    IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
        -- Get next version number
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
        FROM document_versions
        WHERE document_id = NEW.id;

        -- Create version record
        INSERT INTO document_versions (
            document_id,
            version_number,
            title,
            content,
            content_type,
            created_by,
            change_summary
        ) VALUES (
            NEW.id,
            next_version,
            NEW.title,
            NEW.content,
            NEW.content_type,
            NEW.last_edited_by,
            'Auto-saved version'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_versioning_trigger ON documents;
CREATE TRIGGER document_versioning_trigger
    AFTER UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_version();

-- ============================================
-- TRIGGERS FOR FULL-TEXT SEARCH
-- ============================================
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_search_vector_update ON documents;
CREATE TRIGGER document_search_vector_update
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get document with collaborators
CREATE OR REPLACE FUNCTION get_document_with_permissions(
    p_document_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    document_id UUID,
    title VARCHAR(500),
    content TEXT,
    permission_level VARCHAR(50),
    can_edit BOOLEAN,
    can_comment BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        COALESCE(dc.permission_level,
            CASE WHEN d.is_public THEN 'view' ELSE NULL END
        ) AS permission_level,
        COALESCE(dc.permission_level IN ('edit', 'admin'), false) AS can_edit,
        COALESCE(dc.permission_level IN ('comment', 'edit', 'admin'), false) AS can_comment
    FROM documents d
    LEFT JOIN document_collaborators dc ON d.id = dc.document_id AND dc.user_id = p_user_id
    WHERE d.id = p_document_id
    AND (dc.user_id IS NOT NULL OR d.is_public = true OR d.created_by = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Function to search documents
CREATE OR REPLACE FUNCTION search_documents(
    p_workspace_id UUID,
    p_search_query TEXT,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    document_id UUID,
    title VARCHAR(500),
    content_preview TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        LEFT(d.content, 200) AS content_preview,
        ts_rank(d.search_vector, query) AS rank
    FROM documents d,
         to_tsquery('english', p_search_query) query
    WHERE d.workspace_id = p_workspace_id
    AND d.is_archived = false
    AND d.search_vector @@ query
    ORDER BY rank DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get document breadcrumb path
CREATE OR REPLACE FUNCTION get_document_breadcrumb(p_document_id UUID)
RETURNS TABLE (
    level INT,
    document_id UUID,
    title VARCHAR(500)
) AS $$
WITH RECURSIVE breadcrumb AS (
    -- Base case: start with the document
    SELECT
        0 AS level,
        d.id,
        d.title,
        d.parent_id
    FROM documents d
    WHERE d.id = p_document_id

    UNION ALL

    -- Recursive case: get parent
    SELECT
        b.level + 1,
        d.id,
        d.title,
        d.parent_id
    FROM documents d
    INNER JOIN breadcrumb b ON d.id = b.parent_id
)
SELECT
    level,
    id AS document_id,
    title
FROM breadcrumb
ORDER BY level DESC;
$$ LANGUAGE sql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE documents IS 'Documents, wiki pages, notes, and folders for knowledge management';
COMMENT ON TABLE document_versions IS 'Version history for documents with change tracking';
COMMENT ON TABLE document_collaborators IS 'Users with specific permissions on documents';
COMMENT ON TABLE document_comments IS 'Comments and discussions on documents with inline support';
COMMENT ON TABLE document_links IS 'Cross-references between documents for knowledge graphs';
COMMENT ON TABLE document_favorites IS 'User-favorited documents for quick access';
COMMENT ON TABLE document_views IS 'Document view tracking for analytics';
COMMENT ON TABLE wiki_categories IS 'Categories/namespaces for organizing wiki pages';
COMMENT ON TABLE document_categories IS 'Association between documents and categories';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
