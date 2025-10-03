import { useState, FormEvent } from 'react';
import { XMarkIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { invitationService, Invitation } from '../services/invitation';
import toast from 'react-hot-toast';

interface InviteUserModalProps {
  workspaceId: string;
  onClose: () => void;
}

export default function InviteUserModal({ workspaceId, onClose }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const invitation = await invitationService.createInvitation(workspaceId, email, role);
      setCreatedInvitation(invitation);
      toast.success('Invitation created successfully!');
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const getInvitationLink = () => {
    if (!createdInvitation?.token) return '';
    return `${window.location.origin}/invite/${createdInvitation.token}`;
  };

  const handleCopyLink = async () => {
    const link = getInvitationLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Invite People to Workspace</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {role === 'admin'
                ? 'Admins can manage workspace settings and invite users'
                : 'Members can view channels and participate in conversations'}
            </p>
          </div>

          {createdInvitation && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm font-medium text-green-800 mb-2">Invitation Created!</p>
              <p className="text-xs text-green-700 mb-3">
                Share this link with {createdInvitation.email}. It will expire in 7 days.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getInvitationLink()}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-green-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span className="text-sm">Copied</span>
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
            >
              {createdInvitation ? 'Done' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
