import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { RootState } from '../store';
import { Workspace, Channel } from '../types';
import { PlusIcon, HashtagIcon, LockClosedIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, MagnifyingGlassIcon, StarIcon, BellSlashIcon, UserPlusIcon, ArchiveBoxIcon, CpuChipIcon, ClipboardDocumentListIcon, CheckCircleIcon, DocumentTextIcon, WrenchScrewdriverIcon, LightBulbIcon, PencilSquareIcon, ChartBarIcon, DocumentDuplicateIcon, CalendarIcon, ClockIcon, MegaphoneIcon, BriefcaseIcon, UsersIcon, CurrencyDollarIcon, TrophyIcon, ArrowTrendingUpIcon as TrendingUp } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { dmService, DMGroup } from '../services/dm';
import PresenceIndicator from './PresenceIndicator';
import StatusSelector from './StatusSelector';
import WorkspaceSettingsModal from './WorkspaceSettingsModal';
import ArchivedChannelsModal from './ArchivedChannelsModal';

interface SidebarProps {
  workspace: Workspace;
  channels: Channel[];
  currentChannel: Channel | null;
  onCreateChannel: () => void;
  onCreateDM: () => void;
  onBrowseChannels: () => void;
  onInviteUser?: () => void;
  onToggleStar: (channelId: string, isCurrentlyStarred: boolean) => void;
  onTournamentClick?: () => void;
  showTournamentDashboard?: boolean;
}

export default function Sidebar({
  workspace,
  channels,
  currentChannel,
  onCreateChannel,
  onCreateDM,
  onBrowseChannels,
  onInviteUser,
  onToggleStar,
  onTournamentClick,
  showTournamentDashboard = false,
}: SidebarProps) {
  const { workspaceId, dmGroupId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [dms, setDms] = useState<DMGroup[]>([]);
  const [loadingDMs, setLoadingDMs] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showArchivedChannels, setShowArchivedChannels] = useState(false);

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
      const names = dm.members
        .map((m) => m.displayName)
        .filter(Boolean)
        .join(', ');
      return names || 'Group Chat';
    }
    // For 1-on-1, show the other person's name
    const otherMember = dm.members.find((m) => m.id !== currentUser?.id);
    return otherMember?.displayName || 'Unknown User';
  };

  const getOtherMember = (dm: DMGroup) => {
    if (dm.isGroup) return null;
    return dm.members.find((m) => m.id !== currentUser?.id);
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

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      {/* Workspace header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <Link to="/workspaces" className="flex-1">
            <h2 className="text-lg font-bold truncate hover:text-gray-300">
              {workspace.name}
            </h2>
          </Link>
          <div className="flex gap-1">
            {onInviteUser && (
              <button
                onClick={onInviteUser}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                title="Invite people"
              >
                <UserPlusIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowWorkspaceSettings(true)}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="Workspace settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Selector */}
        <div>
          <StatusSelector
            currentStatus={presenceStatus}
            onStatusChange={setPresenceStatus}
          />
        </div>
      </div>

      {/* Workspace Settings Modal */}
      {showWorkspaceSettings && (
        <WorkspaceSettingsModal
          workspace={workspace}
          isOpen={showWorkspaceSettings}
          onClose={() => setShowWorkspaceSettings(false)}
          onWorkspaceUpdated={() => {
            // Reload workspace data if needed
            window.location.reload();
          }}
        />
      )}

      {/* Tournament section (only for tournament workspaces) */}
      {workspace.workspaceType === 'tournament' && onTournamentClick && (
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={onTournamentClick}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              showTournamentDashboard
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            )}
          >
            <TrophyIcon className="w-5 h-5" />
            Tournament Dashboard
          </button>
        </div>
      )}

      {/* Channels section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Channels</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setShowArchivedChannels(true)}
                className="p-1 hover:bg-gray-700 rounded"
                title="View archived channels"
              >
                <ArchiveBoxIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onBrowseChannels}
                className="p-1 hover:bg-gray-700 rounded"
                title="Browse channels"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onCreateChannel}
                className="p-1 hover:bg-gray-700 rounded"
                title="Create channel"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {channels
              .filter((c) => !c.isPrivate || c.isMember)
              .sort((a, b) => {
                // Starred channels first
                if (a.isStarred && !b.isStarred) return -1;
                if (!a.isStarred && b.isStarred) return 1;
                return 0;
              })
              .map((channel) => (
                <div
                  key={channel.id}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700 group',
                    currentChannel?.id === channel.id && 'bg-gray-700 font-semibold'
                  )}
                >
                  <button
                    onClick={() => navigate(`/workspace/${workspaceId}/channel/${channel.id}`)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {channel.isPrivate ? (
                      <LockClosedIcon className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <HashtagIcon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="truncate text-sm">{channel.name}</span>
                    {channel.isMuted && (
                      <BellSlashIcon className="w-3 h-3 flex-shrink-0 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(channel.id, channel.isStarred || false);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title={channel.isStarred ? 'Unstar channel' : 'Star channel'}
                  >
                    {channel.isStarred ? (
                      <StarIconSolid className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                    )}
                  </button>
                </div>
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

        {/* Personal section - Only for standard workspaces */}
        {workspace.workspaceType !== 'tournament' && (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300">Personal</h3>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/personal`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">Habit Tracker</span>
              </button>
            </div>
          </div>
        )}

        {/* Knowledge section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Knowledge</h3>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/documents`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <DocumentTextIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Documents & Wiki</span>
            </button>
          </div>
        </div>

        {/* Collaboration section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Collaboration</h3>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/collaboration?tool=whiteboard`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <PencilSquareIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Whiteboard</span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/collaboration?tool=mindmap`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <LightBulbIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Mind Map</span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/collaboration?tool=polls`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <ChartBarIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Polls & Voting</span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/collaboration?tool=forms`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <DocumentDuplicateIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Forms Builder</span>
            </button>
          </div>
        </div>

        {/* Meetings section - Modified for workspace type */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">
              {workspace.workspaceType === 'tournament' ? 'Events' : 'Meetings'}
            </h3>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/meetings?tool=notes`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <DocumentTextIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">
                {workspace.workspaceType === 'tournament' ? 'Event Notes' : 'Meeting Notes'}
              </span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/meetings?tool=calendar`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <CalendarIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Calendar</span>
            </button>
            {workspace.workspaceType !== 'tournament' && (
              <>
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/meetings?tool=standup`)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
                >
                  <MegaphoneIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm">Standup Bot</span>
                </button>
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/meetings?tool=decisions`)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
                >
                  <LightBulbIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm">Decision Log</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tools section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Tools</h3>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/tools`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <WrenchScrewdriverIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Utility Tools</span>
            </button>
          </div>
        </div>

        {/* Business section - Only for standard workspaces */}
        {workspace.workspaceType !== 'tournament' && (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300">Business</h3>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/business?tool=crm`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <UsersIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">CRM (Classic)</span>
              </button>

              {/* Salesforce-style CRM */}
              <div className="pl-4 space-y-1 border-l-2 border-gray-600 ml-2">
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/crm`)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700 text-sm"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="truncate">Dashboard</span>
                </button>
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/leads`)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700 text-sm"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="truncate">Leads</span>
                </button>
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/opportunities`)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700 text-sm"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="truncate">Pipeline</span>
                </button>
              </div>

              <button
                onClick={() => navigate(`/workspace/${workspaceId}/business?tool=invoicing`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <DocumentTextIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">Invoicing</span>
              </button>
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/business?tool=expenses`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <CurrencyDollarIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">Expense Tracker</span>
              </button>
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/business?tool=timeoff`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">Time Off</span>
              </button>
            </div>
          </div>
        )}

        {/* Marketing section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">Marketing</h3>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/marketing/sprints`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Marketing Sprints</span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/marketing?tool=emails`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <MegaphoneIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Email Campaigns</span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/marketing?tool=social`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <UsersIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Social Media</span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/marketing?tool=graphics`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <PencilSquareIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Graphics & Posters</span>
            </button>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/marketing?tool=sponsors`)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
            >
              <BriefcaseIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">Sponsorships</span>
            </button>
          </div>
        </div>

        {/* AI Agents section - Only for standard workspaces */}
        {workspace.workspaceType !== 'tournament' && (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-300">AI Agents</h3>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/agents`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <CpuChipIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">Agent Dashboard</span>
              </button>
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/tasks`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <ClipboardDocumentListIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">Task Board</span>
              </button>
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/projects`)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-gray-700"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="truncate text-sm">Projects</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Archived Channels Modal */}
      {showArchivedChannels && (
        <ArchivedChannelsModal
          workspaceId={workspace.id}
          onClose={() => setShowArchivedChannels(false)}
          onUnarchive={() => {
            // Refresh channels list
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}