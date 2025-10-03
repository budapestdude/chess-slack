import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchWorkspace } from '../store/slices/workspaceSlice';
import { fetchChannels, setCurrentChannel } from '../store/slices/channelSlice';
import Sidebar from '../components/Sidebar';
import ChannelView from '../components/ChannelView';
import DMView from '../components/DMView';
import CreateChannelModal from '../components/CreateChannelModal';
import CreateDMModal from '../components/CreateDMModal';
import ChannelBrowserModal from '../components/ChannelBrowserModal';
import InviteUserModal from '../components/InviteUserModal';
import NotificationBell from '../components/NotificationBell';
import SearchBar from '../components/SearchBar';
import ChannelSettingsDropdown from '../components/ChannelSettingsDropdown';
import { dmService, DMGroup } from '../services/dm';
import { channelService } from '../services/channel';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import ChannelHeader from '../components/ChannelHeader';
import toast from 'react-hot-toast';

export default function WorkspacePage() {
  const { workspaceId, channelId, dmGroupId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);
  const { channels, currentChannel } = useSelector((state: RootState) => state.channel);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);
  const [showChannelBrowser, setShowChannelBrowser] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentDM, setCurrentDM] = useState<DMGroup | null>(null);

  useEffect(() => {
    if (workspaceId) {
      dispatch(fetchWorkspace(workspaceId));
      dispatch(fetchChannels(workspaceId));
    }
  }, [workspaceId, dispatch]);

  useEffect(() => {
    if (channelId && channels.length > 0) {
      const channel = channels.find((c) => c.id === channelId);
      if (channel) {
        dispatch(setCurrentChannel(channel));
        setCurrentDM(null);
      }
    } else if (!channelId && !dmGroupId && channels.length > 0) {
      // Navigate to general channel by default
      const generalChannel = channels.find((c) => c.name === 'general');
      if (generalChannel) {
        navigate(`/workspace/${workspaceId}/channel/${generalChannel.id}`);
      }
    }
  }, [channelId, dmGroupId, channels, workspaceId, dispatch, navigate]);

  useEffect(() => {
    const loadDM = async () => {
      if (dmGroupId && workspaceId) {
        try {
          const dms = await dmService.getUserDMs(workspaceId);
          const dm = dms.find((d) => d.id === dmGroupId);
          if (dm) {
            setCurrentDM(dm);
            dispatch(setCurrentChannel(null));
          }
        } catch (error) {
          console.error('Failed to load DM:', error);
        }
      }
    };
    loadDM();
  }, [dmGroupId, workspaceId, dispatch]);

  const handleToggleStar = async (channelId: string, isCurrentlyStarred: boolean) => {
    try {
      if (isCurrentlyStarred) {
        await channelService.unstarChannel(workspaceId!, channelId);
        toast.success('Channel unstarred');
      } else {
        await channelService.starChannel(workspaceId!, channelId);
        toast.success('Channel starred');
      }
      dispatch(fetchChannels(workspaceId!));
    } catch (error) {
      console.error('Failed to toggle star:', error);
      toast.error('Failed to update channel');
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        workspace={currentWorkspace}
        channels={channels}
        currentChannel={currentChannel}
        onCreateChannel={() => setShowCreateChannel(true)}
        onCreateDM={() => setShowCreateDM(true)}
        onBrowseChannels={() => setShowChannelBrowser(true)}
        onInviteUser={() => setShowInviteModal(true)}
        onToggleStar={handleToggleStar}
      />

      <div className="flex-1 flex flex-col">
        {/* Header bar with channel info, search, and notification bell */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
          {/* Left: Channel/DM Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {currentChannel ? (
              <>
                <ChannelHeader
                  channel={currentChannel}
                  workspaceId={workspaceId!}
                  onChannelUpdated={() => {
                    dispatch(fetchChannels(workspaceId!));
                  }}
                />
                <ChannelSettingsDropdown
                  channel={{
                    id: currentChannel.id,
                    workspaceId: workspaceId!,
                    name: currentChannel.name,
                    description: currentChannel.description,
                    topic: currentChannel.topic,
                    isMember: currentChannel.isMember,
                    userRole: currentChannel.userRole,
                  }}
                  onChannelUpdated={() => {
                    dispatch(fetchChannels(workspaceId!));
                  }}
                />
              </>
            ) : currentDM ? (
              <>
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold">
                  {currentDM.isGroup
                    ? currentDM.members.map((m) => m.displayName).join(', ')
                    : currentDM.members.find((m) => m.id !== currentDM.members[0].id)?.displayName || 'Direct Message'}
                </h2>
              </>
            ) : null}
          </div>

          {/* Right: Search and Notifications */}
          <div className="flex items-center gap-4">
            <SearchBar workspaceId={workspaceId!} />
            <NotificationBell />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {currentChannel ? (
            <ChannelView channel={currentChannel} workspaceId={workspaceId!} />
          ) : currentDM ? (
            <DMView dmGroup={currentDM} workspaceId={workspaceId!} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-xl text-gray-500">Select a channel or direct message to start</div>
            </div>
          )}
        </div>
      </div>

      {showCreateChannel && (
        <CreateChannelModal
          workspaceId={workspaceId!}
          onClose={() => setShowCreateChannel(false)}
        />
      )}

      {showCreateDM && (
        <CreateDMModal
          workspaceId={workspaceId!}
          onClose={() => setShowCreateDM(false)}
        />
      )}

      {showChannelBrowser && (
        <ChannelBrowserModal
          isOpen={showChannelBrowser}
          workspaceId={workspaceId!}
          onClose={() => setShowChannelBrowser(false)}
          onChannelJoined={() => {
            dispatch(fetchChannels(workspaceId!));
          }}
        />
      )}

      {showInviteModal && (
        <InviteUserModal
          workspaceId={workspaceId!}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}