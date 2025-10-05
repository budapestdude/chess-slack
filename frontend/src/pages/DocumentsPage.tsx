import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  Search,
  Plus,
  Folder,
  FolderOpen,
  FileText,
  BookOpen,
  StickyNote,
  Star,
  ChevronRight,
  ChevronDown,
  Filter,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import DocumentEditor from '../components/DocumentEditor';
import {
  Document,
  DocumentTreeNode,
  getDocuments,
  getDocumentTree,
  createDocument,
  searchDocuments,
} from '../services/document';

/**
 * DocumentsPage Component
 * Notion-like document and wiki management interface
 * Features: Sidebar with tree navigation, document editor, search, favorites
 */
const DocumentsPage: React.FC = () => {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTree, setDocumentTree] = useState<DocumentTreeNode[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'document' | 'wiki' | 'note'>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  // Get workspaceId from route params and user from Redux store
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const currentUserId = currentUser?.id || '';

  // Load documents on mount
  useEffect(() => {
    if (workspaceId) {
      loadDocuments();
      // loadDocumentTree(); // TODO: Backend doesn't have tree endpoint yet
    }
  }, [workspaceId, filterType, showFavorites]);

  // Search debounce
  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const loadDocuments = async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      const filters: any = {};
      if (filterType !== 'all') filters.type = filterType;
      if (showFavorites) filters.favorites = true;

      const data = await getDocuments(workspaceId, filters);
      setDocuments(data);

      // Build tree structure from documents
      const tree = buildTreeFromDocuments(data);
      setDocumentTree(tree);
    } catch (error) {
      console.error('Error loading documents:', error);
      // Mock data for demo
      setDocuments(getMockDocuments());
      setDocumentTree(getMockTree());
    } finally {
      setIsLoading(false);
    }
  };

  const buildTreeFromDocuments = (docs: Document[]): DocumentTreeNode[] => {
    return docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      icon: doc.icon,
      isFavorite: doc.isFavorite,
      parentId: doc.parentId,
      children: [],
    }));
  };

  const loadDocumentTree = async () => {
    if (!workspaceId) return;

    try {
      const tree = await getDocumentTree(workspaceId);
      setDocumentTree(tree);
    } catch (error) {
      console.error('Error loading document tree:', error);
      setDocumentTree(getMockTree());
    }
  };

  const handleSearch = async () => {
    if (!workspaceId || !searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchDocuments(workspaceId, searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching documents:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateDocument = async (type: 'document' | 'wiki' | 'note') => {
    if (!workspaceId) return;

    try {
      const newDoc = await createDocument(workspaceId, {
        title: 'Untitled',
        content: '',
        type,
      });
      setDocuments([...documents, newDoc]);
      setSelectedDocument(newDoc);
      // Reload documents list to include the new document
      await loadDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDocumentSelect = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      setSelectedDocument(doc);
    }
  };

  const getDocumentIcon = (type: string, isFavorite: boolean = false) => {
    if (isFavorite) return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'wiki':
        return <BookOpen className="w-4 h-4 text-green-500" />;
      case 'note':
        return <StickyNote className="w-4 h-4 text-purple-500" />;
      case 'folder':
        return <Folder className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderTreeNode = (node: DocumentTreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedDocument?.id === node.id;

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.id);
            } else {
              handleDocumentSelect(node.id);
            }
          }}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
            ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
          `}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          {node.icon ? (
            <span className="text-lg">{node.icon}</span>
          ) : (
            getDocumentIcon(node.type, node.isFavorite)
          )}
          <span className="truncate flex-1 text-left">{node.title}</span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const favorites = documents.filter((doc) => doc.isFavorite);
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getMockDocuments = (): Document[] => [
    {
      id: '1',
      workspaceId,
      title: 'Getting Started Guide',
      content: '<h1>Welcome!</h1><p>Start documenting your work here.</p>',
      type: 'document',
      icon: '📚',
      createdBy: currentUserId,
      lastEditedBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: true,
      isArchived: false,
      collaborators: [],
      permissions: 'admin',
    },
  ];

  const getMockTree = (): DocumentTreeNode[] => [
    {
      id: '1',
      title: 'Getting Started Guide',
      type: 'document',
      icon: '📚',
      isFavorite: true,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Back Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workspace
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2 border-b border-gray-200">
          <button
            onClick={() => handleCreateDocument('document')}
            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
          <button
            onClick={() => handleCreateDocument('wiki')}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Wiki Page
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Filter
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'document', 'wiki', 'note'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`
                  px-3 py-1 rounded-md text-xs font-medium transition-colors
                  ${
                    filterType === type
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`
              mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                showFavorites
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <Star className={`w-4 h-4 ${showFavorites ? 'fill-yellow-500' : ''}`} />
            Favorites Only
          </button>
        </div>

        {/* Document Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchQuery && searchResults.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1
                    ${
                      selectedDocument?.id === doc.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {doc.icon ? (
                    <span className="text-lg">{doc.icon}</span>
                  ) : (
                    getDocumentIcon(doc.type)
                  )}
                  <span className="truncate flex-1 text-left">{doc.title}</span>
                </button>
              ))}
            </div>
          ) : searchQuery && isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {favorites.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Favorites
                  </h3>
                  {favorites.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1
                        ${
                          selectedDocument?.id === doc.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="truncate flex-1 text-left">{doc.title}</span>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  All Documents
                </h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {documentTree.map((node) => renderTreeNode(node))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {selectedDocument ? (
          <DocumentEditor
            document={selectedDocument}
            workspaceId={workspaceId}
            currentUserId={currentUserId}
            onUpdate={(updatedDoc) => {
              setSelectedDocument(updatedDoc);
              setDocuments(
                documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
              );
            }}
            onDelete={() => {
              setSelectedDocument(null);
              loadDocuments();
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="text-center max-w-md px-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <FileText className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Documents
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Create and organize your team's knowledge base. Start by creating a new
                document or selecting an existing one from the sidebar.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleCreateDocument('document')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/30"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Document
                </button>
                <button
                  onClick={() => handleCreateDocument('wiki')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <BookOpen className="w-5 h-5" />
                  Start a Wiki Page
                </button>
              </div>

              {recentDocuments.length > 0 && (
                <div className="mt-12 text-left">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Recent Documents
                  </h3>
                  <div className="space-y-2">
                    {recentDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocument(doc)}
                        className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                      >
                        {doc.icon ? (
                          <span className="text-2xl">{doc.icon}</span>
                        ) : (
                          getDocumentIcon(doc.type)
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {doc.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            Updated{' '}
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DocumentsPage;
