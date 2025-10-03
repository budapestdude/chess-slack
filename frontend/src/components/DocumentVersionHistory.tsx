import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  RotateCcw,
  Eye,
  ChevronRight,
  FileText,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  Document,
  DocumentVersion,
  getVersionHistory,
  restoreVersion,
} from '../services/document';

interface DocumentVersionHistoryProps {
  documentId: string;
  workspaceId: string;
  onClose: () => void;
  onRestore: (document: Document) => void;
}

/**
 * DocumentVersionHistory Component
 * Modal showing document version history with preview and restore functionality
 * Features: Version list, diff view, restore with confirmation
 */
const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  documentId,
  workspaceId,
  onClose,
  onRestore,
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadVersionHistory();
  }, [documentId]);

  const loadVersionHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getVersionHistory(workspaceId, documentId);
      setVersions(data);
      if (data.length > 0) {
        setSelectedVersion(data[0]);
      }
    } catch (error) {
      console.error('Error loading version history:', error);
      // Mock data for demo
      setVersions(getMockVersions());
      if (getMockVersions().length > 0) {
        setSelectedVersion(getMockVersions()[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Restore this version? The current version will be saved in history.')) {
      return;
    }

    setIsRestoring(true);
    try {
      const restoredDocument = await restoreVersion(workspaceId, documentId, versionId);
      onRestore(restoredDocument);
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    let timeAgo = '';
    if (diffInMins < 1) timeAgo = 'just now';
    else if (diffInMins < 60) timeAgo = `${diffInMins}m ago`;
    else if (diffInHours < 24) timeAgo = `${diffInHours}h ago`;
    else if (diffInDays < 7) timeAgo = `${diffInDays}d ago`;
    else
      timeAgo = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    const fullDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return { timeAgo, fullDate };
  };

  const getChangeSummary = (version: DocumentVersion) => {
    if (version.changeSummary) return version.changeSummary;
    // Generate a simple summary based on content changes
    const contentLength = version.content.length;
    if (contentLength < 100) return 'Minor edits';
    if (contentLength < 500) return 'Content updated';
    return 'Major content changes';
  };

  const getMockVersions = (): DocumentVersion[] => {
    const now = new Date();
    return [
      {
        id: 'v1',
        documentId,
        title: 'Getting Started Guide',
        content: '<h1>Getting Started</h1><p>This is the latest version with all updates.</p>',
        editedBy: 'user-1',
        createdAt: new Date(now.getTime() - 3600000).toISOString(),
        changeSummary: 'Updated introduction section',
        user: {
          id: 'user-1',
          name: 'John Doe',
          avatar: '',
        },
      },
      {
        id: 'v2',
        documentId,
        title: 'Getting Started',
        content: '<h1>Getting Started</h1><p>This is an older version.</p>',
        editedBy: 'user-2',
        createdAt: new Date(now.getTime() - 7200000).toISOString(),
        changeSummary: 'Added examples',
        user: {
          id: 'user-2',
          name: 'Jane Smith',
          avatar: '',
        },
      },
      {
        id: 'v3',
        documentId,
        title: 'Getting Started',
        content: '<h1>Getting Started</h1>',
        editedBy: 'user-1',
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        changeSummary: 'Initial draft',
        user: {
          id: 'user-1',
          name: 'John Doe',
          avatar: '',
        },
      },
    ];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Version History</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {versions.length} versions saved
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Version List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">No version history yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Versions are saved automatically as you edit
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {versions.map((version, index) => {
                  const { timeAgo, fullDate } = formatDate(version.createdAt);
                  const isSelected = selectedVersion?.id === version.id;
                  const isCurrent = index === 0;

                  return (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={`
                        w-full text-left p-4 rounded-lg border-2 transition-all
                        ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }
                      `}
                      title={fullDate}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {version.user?.name?.charAt(0) || '?'}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {version.user?.name || 'Unknown User'}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {getChangeSummary(version)}
                          </p>
                          <p className="text-xs text-gray-500">{timeAgo}</p>
                        </div>

                        {/* Arrow */}
                        {isSelected && (
                          <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="flex-1 overflow-y-auto">
            {selectedVersion ? (
              <div className="p-6">
                {/* Version Info */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {selectedVersion.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedVersion.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Edited by {selectedVersion.user?.name || 'Unknown'} •{' '}
                          {formatDate(selectedVersion.createdAt).fullDate}
                        </p>
                      </div>
                    </div>
                    {selectedVersion.id !== versions[0]?.id && (
                      <button
                        onClick={() => handleRestoreVersion(selectedVersion.id)}
                        disabled={isRestoring}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {isRestoring ? 'Restoring...' : 'Restore Version'}
                      </button>
                    )}
                  </div>
                  {selectedVersion.changeSummary && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">
                        {selectedVersion.changeSummary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Warning for non-current versions */}
                {selectedVersion.id !== versions[0]?.id && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                        Viewing older version
                      </h4>
                      <p className="text-xs text-yellow-700">
                        This is not the current version. Restoring will save the current
                        version to history before replacing it with this one.
                      </p>
                    </div>
                  </div>
                )}

                {/* Content Preview */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Content Preview
                    </h4>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Version Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Version ID</span>
                      <div className="text-gray-900 mt-1 font-mono text-xs">
                        {selectedVersion.id}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Content Size</span>
                      <div className="text-gray-900 mt-1">
                        {selectedVersion.content.length.toLocaleString()} characters
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Title</span>
                      <div className="text-gray-900 mt-1">{selectedVersion.title}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Edited By</span>
                      <div className="text-gray-900 mt-1">
                        {selectedVersion.user?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Select a version to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span>Versions are automatically saved as you edit</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionHistory;
