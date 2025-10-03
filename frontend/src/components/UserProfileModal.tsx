import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { userService, UserProfile } from '../services/user';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PresenceIndicator from './PresenceIndicator';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    timezone: '',
  });
  const [statusForm, setStatusForm] = useState({
    customStatus: '',
    statusEmoji: '',
  });
  const [saving, setSaving] = useState(false);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getUserProfile(userId);
      setProfile(data);
      setEditForm({
        displayName: data.displayName,
        bio: data.bio || '',
        timezone: data.timezone || '',
      });
      setStatusForm({
        customStatus: data.customStatus || '',
        statusEmoji: data.statusEmoji || '',
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updated = await userService.updateMyProfile(editForm);
      setProfile(updated);
      toast.success('Profile updated');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    try {
      setSaving(true);
      await userService.setCustomStatus(statusForm);
      toast.success('Status updated');
      await loadProfile();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinDate = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="text-center text-gray-500">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Profile content */}
        <div className="p-6 space-y-6">
          {/* Avatar and basic info */}
          <div className="flex items-start gap-4">
            <div className="relative">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-20 h-20 rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-primary-600 flex items-center justify-center text-white text-2xl font-semibold">
                  {getInitials(profile.displayName)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1">
                <PresenceIndicator status={profile.presenceStatus} size="lg" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {isOwnProfile && isEditing ? (
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-lg font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Display name"
                />
              ) : (
                <h3 className="text-xl font-semibold text-gray-900 truncate">
                  {profile.displayName}
                </h3>
              )}
              <p className="text-sm text-gray-500">@{profile.username}</p>

              {isOwnProfile && isEditing ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={statusForm.statusEmoji}
                    onChange={(e) => setStatusForm({ ...statusForm, statusEmoji: e.target.value })}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="😊"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={statusForm.customStatus}
                    onChange={(e) => setStatusForm({ ...statusForm, customStatus: e.target.value })}
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="What's your status?"
                  />
                </div>
              ) : (
                profile.customStatus && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                    {profile.statusEmoji && <span>{profile.statusEmoji}</span>}
                    <span>{profile.customStatus}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Bio */}
          {(profile.bio || (isOwnProfile && isEditing)) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">About</h4>
              {isOwnProfile && isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
              )}
            </div>
          )}

          {/* Additional info */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            {(profile.timezone || (isOwnProfile && isEditing)) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Local Time</h4>
                {isOwnProfile && isEditing ? (
                  <input
                    type="text"
                    value={editForm.timezone}
                    onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="America/New_York"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{profile.timezone}</p>
                )}
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-700">Member Since</h4>
              <p className="text-sm text-gray-600">Joined {formatJoinDate(profile.createdAt)}</p>
            </div>

            {profile.lastActivity && profile.presenceStatus !== 'online' && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Last Active</h4>
                <p className="text-sm text-gray-600">
                  {formatDistanceToNow(new Date(profile.lastActivity), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {!isOwnProfile && (
              <>
                <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">
                  Send Message
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md">
                  View Channels
                </button>
              </>
            )}
            {isOwnProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Edit Profile
              </button>
            )}
            {isOwnProfile && isEditing && (
              <>
                <button
                  onClick={async () => {
                    await handleSaveProfile();
                    await handleSaveStatus();
                    setIsEditing(false);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      displayName: profile?.displayName || '',
                      bio: profile?.bio || '',
                      timezone: profile?.timezone || '',
                    });
                    setStatusForm({
                      customStatus: profile?.customStatus || '',
                      statusEmoji: profile?.statusEmoji || '',
                    });
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}