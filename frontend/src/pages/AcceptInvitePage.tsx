import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { invitationService, InvitationDetails } from '../services/invitation';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?returnUrl=/invite/${token}`);
      return;
    }

    loadInvitation();
  }, [token, user]);

  const loadInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await invitationService.getInvitationByToken(token);
      setInvitation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      const { workspace } = await invitationService.acceptInvitation(token);
      toast.success(`Welcome to ${workspace.name}!`);
      navigate(`/workspaces/${workspace.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    navigate('/workspaces');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="text-white text-lg">Loading invitation...</div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">{error || 'This invitation link is not valid.'}</p>
            <button
              onClick={() => navigate('/workspaces')}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
            >
              Go to Workspaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = invitation.status === 'expired' || new Date(invitation.expiresAt) < new Date();
  const isAccepted = invitation.status === 'accepted';
  const isRevoked = invitation.status === 'revoked';

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <ClockIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
            <p className="text-gray-600 mb-6">
              This invitation to <span className="font-semibold">{invitation.workspaceName}</span> has expired.
              Please contact the workspace admin for a new invitation.
            </p>
            <button
              onClick={() => navigate('/workspaces')}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
            >
              Go to Workspaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAccepted || isRevoked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isAccepted ? 'Already Accepted' : 'Invitation Revoked'}
            </h1>
            <p className="text-gray-600 mb-6">
              {isAccepted
                ? 'This invitation has already been accepted.'
                : 'This invitation has been revoked by the workspace admin.'}
            </p>
            <button
              onClick={() => navigate('/workspaces')}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
            >
              Go to Workspaces
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {invitation.workspaceLogo ? (
              <img
                src={invitation.workspaceLogo}
                alt={invitation.workspaceName}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <span className="text-2xl font-bold text-primary-600">
                {invitation.workspaceName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">You've been invited!</h1>
          <p className="text-gray-600 mb-4">
            <span className="font-semibold">{invitation.inviterDisplayName}</span> has invited you to
            join
          </p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{invitation.workspaceName}</h2>
          <p className="text-sm text-gray-500 mb-6">as a {invitation.role}</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Invited to:</span>
              <span className="font-medium text-gray-900">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium text-gray-900">
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
