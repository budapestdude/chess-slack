import { useState, FormEvent, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import { dmService } from '../services/dm';
import { workspaceService } from '../services/workspace';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: string;
}

interface CreateDMModalProps {
  workspaceId: string;
  onClose: () => void;
}

export default function CreateDMModal({ workspaceId, onClose }: CreateDMModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const members = await workspaceService.getWorkspaceMembers(workspaceId);
      // Filter out current user
      setWorkspaceMembers(members.filter((m: User) => m.id !== currentUser?.id));
    } catch (error) {
      console.error('Failed to load workspace members:', error);
      toast.error('Failed to load workspace members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setLoading(true);

    try {
      const dmGroup = await dmService.getOrCreateDM(workspaceId, selectedUsers);
      toast.success('Direct message created!');
      navigate(`/workspace/${workspaceId}/dm/${dmGroup.id}`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create direct message');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') return '?';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return initials || '?';
  };

  const filteredMembers = workspaceMembers.filter(
    (member) =>
      member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">New Direct Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Select people to message
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((userId) => {
                const user = workspaceMembers.find((m) => m.id === userId);
                if (!user) return null;
                return (
                  <div
                    key={userId}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    <span>{user.displayName}</span>
                    <button
                      type="button"
                      onClick={() => toggleUser(userId)}
                      className="hover:text-primary-900"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {loadingMembers ? (
              <div className="p-4 text-center text-gray-500">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No members found</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleUser(member.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(member.id)}
                      onChange={() => {}}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className="flex-shrink-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.displayName}
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                          {getInitials(member.displayName)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {member.displayName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        @{member.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedUsers.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Start Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}