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
import NotificationBell from '../components/NotificationBell';
import { dmService, DMGroup } from '../services/dm';

export default function WorkspacePage() {
  const { workspaceId, channelId, dmGroupId } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);
  const { channels, currentChannel } = useSelector((state: RootState) => state.channel);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);
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
      />

      <div className="flex-1 flex flex-col">
        {/* Header bar with notification bell */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-end px-6">
          <NotificationBell />
        </div>

        {currentChannel ? (
          <ChannelView channel={currentChannel} workspaceId={workspaceId!} />
        ) : currentDM ? (
          <DMView dmGroup={currentDM} workspaceId={workspaceId!} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-gray-500">Select a channel or direct message to start</div>
          </div>
        )}
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
    </div>
  );
}