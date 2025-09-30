import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { RootState } from '../store';
import { Workspace, Channel } from '../types';
import { PlusIcon, HashtagIcon, LockClosedIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { dmService, DMGroup } from '../services/dm';
import PresenceIndicator from './PresenceIndicator';
import StatusSelector from './StatusSelector';

interface SidebarProps {
  workspace: Workspace;
  channels: Channel[];
  currentChannel: Channel | null;
  onCreateChannel: () => void;
  onCreateDM: () => void;
}

export default function Sidebar({
  workspace,
  channels,
  currentChannel,
  onCreateChannel,
  onCreateDM,
}: SidebarProps) {
  const { workspaceId, dmGroupId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [dms, setDms] = useState<DMGroup[]>([]);
  const [loadingDMs, setLoadingDMs] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');

  useEffect(() => {
    loadDMs();
  }, [workspace.id]);

  const loadDMs = async () => {
    try {
      setLoadingDMs(true);
      const data = await dmService.getUserDMs(workspace.id);
      setDms(data);
    } catch (error) {
      console.error('Failed to load DMs:', error);
    } finally {
      setLoadingDMs(false);
    }
  };

  const getDMDisplayName = (dm: DMGroup) => {
    if (dm.isGroup) {
      return dm.members.map((m) => m.displayName).join(', ');
    }
    // For 1-on-1, show the other person's name
    const otherMember = dm.members.find((m) => m.id !== currentUser?.id);
    return otherMember?.displayName || 'Unknown';
  };

  const getOtherMember = (dm: DMGroup) => {
    if (dm.isGroup) return null;
    return dm.members.find((m) => m.id !== currentUser?.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      {/* Workspace header */}
      <div className="p-4 border-b border-gray-700">
        <Link to="/workspaces">
          <h2 className="text-lg font-bold truncate hover:text-gray-300">
            {workspace.name}
          </h2>
        </Link>

        {/* Status Selector */}
        <div className="mt-3">
          <StatusSelector
            currentStatus={presenceStatus}
            onStatusChange={setPresenceStatus}
          />
        </div>
      </div>

      {/* Channels section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Channels</h3>
            <button
              onClick={onCreateChannel}
              className="p-1 hover:bg-gray-700 rounded"
              title="Create channel"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {channels
              .filter((c) => !c.isPrivate || c.isMember)
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => navigate(`/workspace/${workspaceId}/channel/${channel.id}`)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700',
                    currentChannel?.id === channel.id && 'bg-gray-700 font-semibold'
                  )}
                >
                  {channel.isPrivate ? (
                    <LockClosedIcon className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <HashtagIcon className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate text-sm">{channel.name}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Direct Messages section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Direct Messages</h3>
            <button
              onClick={onCreateDM}
              className="p-1 hover:bg-gray-700 rounded"
              title="New direct message"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          {loadingDMs ? (
            <p className="text-xs text-gray-500">Loading...</p>
          ) : dms.length === 0 ? (
            <p className="text-xs text-gray-500">No direct messages yet</p>
          ) : (
            <div className="space-y-1">
              {dms.map((dm) => {
                const displayName = getDMDisplayName(dm);
                const otherMember = getOtherMember(dm);

                return (
                  <button
                    key={dm.id}
                    onClick={() => navigate(`/workspace/${workspaceId}/dm/${dm.id}`)}
                    className={clsx(
                      'w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700',
                      dmGroupId === dm.id && 'bg-gray-700 font-semibold'
                    )}
                  >
                    <div className="flex-shrink-0 relative">
                      {!dm.isGroup && otherMember?.avatarUrl ? (
                        <img
                          src={otherMember.avatarUrl}
                          alt={displayName}
                          className="w-6 h-6 rounded"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-primary-600 flex items-center justify-center text-xs font-semibold">
                          {getInitials(displayName)}
                        </div>
                      )}
                      {/* Presence indicator for 1-on-1 DMs */}
                      {!dm.isGroup && otherMember && (
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <PresenceIndicator
                            status={(otherMember as any).presenceStatus || 'offline'}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm">{displayName}</span>
                        {dm.unreadCount && dm.unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {dm.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}