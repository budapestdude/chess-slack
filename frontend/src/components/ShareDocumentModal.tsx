import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Link as LinkIcon,
  Check,
  UserPlus,
  Trash2,
  ChevronDown,
  Globe,
  Lock,
  Copy,
} from 'lucide-react';
import {
  Document,
  Collaborator,
  addCollaborator,
  updateCollaboratorPermission,
  removeCollaborator,
} from '../services/document';

interface ShareDocumentModalProps {
  document: Document;
  workspaceId: string;
  onClose: () => void;
  onUpdate: (document: Document) => void;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

/**
 * ShareDocumentModal Component
 * Modal for managing document collaborators and sharing settings
 * Features: Add users, change permissions, remove access, copy link
 */
const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  document,
  workspaceId,
  onClose,
  onUpdate,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(
    document.collaborators || []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activePermissionMenu, setActivePermissionMenu] = useState<string | null>(null);

  // Mock workspace members - in production, fetch from API
  const [workspaceMembers] = useState<WorkspaceMember[]>([
    { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
    { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: 'user-3', name: 'Bob Johnson', email: 'bob@example.com' },
    { id: 'user-4', name: 'Alice Williams', email: 'alice@example.com' },
    { id: 'user-5', name: 'Charlie Brown', email: 'charlie@example.com' },
  ]);

  useEffect(() => {
    setCollaborators(document.collaborators || []);
  }, [document]);

  const availableUsers = workspaceMembers.filter(
    (member) =>
      !collaborators.some((collab) => collab.userId === member.id) &&
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCollaborator = async (userId: string, permission: 'view' | 'comment' | 'edit' | 'admin') => {
    setIsAddingUser(true);
    try {
      const newCollaborator = await addCollaborator(
        workspaceId,
        document.id,
        userId,
        permission
      );
      setCollaborators([...collaborators, newCollaborator]);
      setSearchQuery('');
      setShowUserSearch(false);
      // Refresh document
      const updatedDoc = { ...document, collaborators: [...collaborators, newCollaborator] };
      onUpdate(updatedDoc);
    } catch (error) {
      console.error('Error adding collaborator:', error);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleUpdatePermission = async (userId: string, permission: 'view' | 'comment' | 'edit' | 'admin') => {
    try {
      await updateCollaboratorPermission(workspaceId, document.id, userId, permission);
      const updatedCollaborators = collaborators.map((c) =>
        c.userId === userId ? { ...c, permission } : c
      );
      setCollaborators(updatedCollaborators);
      setActivePermissionMenu(null);
      // Refresh document
      const updatedDoc = { ...document, collaborators: updatedCollaborators };
      onUpdate(updatedDoc);
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm('Remove this collaborator?')) return;

    try {
      await removeCollaborator(workspaceId, document.id, userId);
      const updatedCollaborators = collaborators.filter((c) => c.userId !== userId);
      setCollaborators(updatedCollaborators);
      // Refresh document
      const updatedDoc = { ...document, collaborators: updatedCollaborators };
      onUpdate(updatedDoc);
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/workspaces/${workspaceId}/documents/${document.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'view':
        return 'Can view';
      case 'comment':
        return 'Can comment';
      case 'edit':
        return 'Can edit';
      case 'admin':
        return 'Full access';
      default:
        return permission;
    }
  };

  const getPermissionDescription = (permission: string) => {
    switch (permission) {
      case 'view':
        return 'Can only view the document';
      case 'comment':
        return 'Can view and add comments';
      case 'edit':
        return 'Can view, comment, and edit';
      case 'admin':
        return 'Can manage all settings';
      default:
        return '';
    }
  };

  const permissionOptions: Array<'view' | 'comment' | 'edit' | 'admin'> = [
    'view',
    'comment',
    'edit',
    'admin',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Share Document</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Copy Link Section */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <LinkIcon className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={`${window.location.origin}/workspaces/${workspaceId}/documents/${document.id}`}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add User Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowUserSearch(true);
                }}
                onFocus={() => setShowUserSearch(true)}
                placeholder="Add people by name or email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* User Search Dropdown */}
            {showUserSearch && searchQuery && availableUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-10">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddCollaborator(user.id, 'edit')}
                    disabled={isAddingUser}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <UserPlus className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Collaborators List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            People with access ({collaborators.length})
          </h3>

          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.userId}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {collaborator.user?.name?.charAt(0) || '?'}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {collaborator.user?.name || 'Unknown User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {collaborator.user?.email || ''}
                  </div>
                </div>

                {/* Permission Dropdown */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActivePermissionMenu(
                        activePermissionMenu === collaborator.userId
                          ? null
                          : collaborator.userId
                      )
                    }
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    {getPermissionLabel(collaborator.permission)}
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {activePermissionMenu === collaborator.userId && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {permissionOptions.map((permission) => (
                        <button
                          key={permission}
                          onClick={() => handleUpdatePermission(collaborator.userId, permission)}
                          className={`
                            w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors
                            ${collaborator.permission === permission ? 'bg-blue-50' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div
                                className={`text-sm font-medium ${
                                  collaborator.permission === permission
                                    ? 'text-blue-700'
                                    : 'text-gray-900'
                                }`}
                              >
                                {getPermissionLabel(permission)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {getPermissionDescription(permission)}
                              </div>
                            </div>
                            {collaborator.permission === permission && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveCollaborator(collaborator.userId)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Remove access"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                </button>
              </div>
            ))}

            {collaborators.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mb-1">No collaborators yet</p>
                <p className="text-xs text-gray-500">
                  Search above to add people to this document
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              {document.permissions === 'admin' ? (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Anyone with the link can view</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Restricted access</span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close user search */}
      {showUserSearch && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setShowUserSearch(false)}
        />
      )}

      {/* Click outside to close permission menu */}
      {activePermissionMenu && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setActivePermissionMenu(null)}
        />
      )}
    </div>
  );
};

export default ShareDocumentModal;
