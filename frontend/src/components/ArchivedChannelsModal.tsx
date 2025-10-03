import { useState, useEffect } from 'react';
import { XMarkIcon, HashtagIcon, LockClosedIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { archiveService, ArchivedChannel } from '../services/archive';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface ArchivedChannelsModalProps {
  workspaceId: string;
  onClose: () => void;
  onUnarchive?: () => void;
}

export default function ArchivedChannelsModal({
  workspaceId,
  onClose,
  onUnarchive,
}: ArchivedChannelsModalProps) {
  const [channels, setChannels] = useState<ArchivedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadArchivedChannels();
  }, [workspaceId]);

  const loadArchivedChannels = async () => {
    try {
      setLoading(true);
      const data = await archiveService.getArchivedChannels(workspaceId);
      setChannels(data);
    } catch (error) {
      console.error('Failed to load archived channels:', error);
      toast.error('Failed to load archived channels');
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (channelId: string, channelName: string) => {
    try {
      setProcessing(channelId);
      await archiveService.unarchiveChannel(workspaceId, channelId);
      toast.success(`#${channelName} unarchived`);
      await loadArchivedChannels();
      if (onUnarchive) onUnarchive();
    } catch (error: any) {
      console.error('Failed to unarchive channel:', error);
      toast.error(error.response?.data?.error || 'Failed to unarchive channel');
    } finally {
      setProcessing(null);
    }
  };

  const handleExport = async (channelId: string, channelName: string) => {
    try {
      setProcessing(channelId);
      const exportData = await archiveService.exportChannelHistory(workspaceId, channelId);
      archiveService.downloadExportAsJSON(exportData, channelName);
      toast.success(`#${channelName} exported`);
    } catch (error: any) {
      console.error('Failed to export channel:', error);
      toast.error(error.response?.data?.error || 'Failed to export channel');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Archived Channels</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">Loading archived channels...</div>
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No archived channels</p>
              <p className="text-sm text-gray-400">
                Channels that are archived will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {channel.isPrivate ? (
                          <LockClosedIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <HashtagIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-lg truncate">{channel.name}</h3>
                        {channel.isPrivate && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            Private
                          </span>
                        )}
                      </div>

                      {channel.description && (
                        <p className="text-sm text-gray-600 mb-2">{channel.description}</p>
                      )}

                      <div className="text-xs text-gray-500 space-y-1">
                        <p>
                          Archived {formatDistanceToNow(new Date(channel.archivedAt), { addSuffix: true })}
                          {channel.archivedBy && ` by ${channel.archivedBy.displayName}`}
                        </p>
                        <p>{channel.messageCount} messages</p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleExport(channel.id, channel.name)}
                        disabled={processing === channel.id}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Export channel history"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Export
                      </button>
                      <button
                        onClick={() => handleUnarchive(channel.id, channel.name)}
                        disabled={processing === channel.id}
                        className="px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === channel.id ? 'Unarchiving...' : 'Unarchive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
