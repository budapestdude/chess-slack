import { useState } from 'react';
import { HashtagIcon, LockClosedIcon, InformationCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { channelService } from '../services/channel';
import toast from 'react-hot-toast';
import { Channel } from '../types';

interface ChannelHeaderProps {
  channel: Channel;
  workspaceId: string;
  onChannelUpdated: () => void;
}

export default function ChannelHeader({ channel, workspaceId, onChannelUpdated }: ChannelHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [topic, setTopic] = useState(channel.topic || '');
  const [saving, setSaving] = useState(false);

  const canEdit = channel.userRole === 'owner' || channel.userRole === 'admin';

  const handleSaveTopic = async () => {
    if (topic === channel.topic) {
      setEditingTopic(false);
      return;
    }

    try {
      setSaving(true);
      await channelService.updateChannel(workspaceId, channel.id, {
        topic: topic.trim() || undefined,
      });
      toast.success('Topic updated');
      onChannelUpdated();
      setEditingTopic(false);
    } catch (error: any) {
      console.error('Failed to update topic:', error);
      toast.error('Failed to update topic');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setTopic(channel.topic || '');
    setEditingTopic(false);
  };

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {channel.isPrivate ? (
        <LockClosedIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
      ) : (
        <HashtagIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
      )}

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h2 className="text-lg font-semibold truncate">{channel.name}</h2>

        {!editingTopic && channel.topic && (
          <span className="text-sm text-gray-600 truncate max-w-md border-l border-gray-300 pl-2">
            {channel.topic}
          </span>
        )}

        {!editingTopic && canEdit && (
          <button
            onClick={() => setEditingTopic(true)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            title="Edit topic"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        )}

        {editingTopic && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTopic();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Add a topic..."
              autoFocus
              disabled={saving}
            />
            <button
              onClick={handleSaveTopic}
              disabled={saving}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {channel.description && (
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            title={showInfo ? 'Hide info' : 'Show info'}
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Info Popover */}
      {showInfo && channel.description && (
        <div className="absolute top-16 left-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md z-10">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900">About this channel</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{channel.description}</p>
          {channel.topic && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Topic</p>
              <p className="text-sm text-gray-700">{channel.topic}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}