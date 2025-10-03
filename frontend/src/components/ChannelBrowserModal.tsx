import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, HashtagIcon, LockClosedIcon, UsersIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Channel } from '../types';
import { channelService } from '../services/channel';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

interface ChannelBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onChannelJoined: () => void;
}

export default function ChannelBrowserModal({
  isOpen,
  onClose,
  workspaceId,
  onChannelJoined,
}: ChannelBrowserModalProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningChannels, setJoiningChannels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadChannels();
    }
  }, [isOpen, workspaceId]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await channelService.browseChannels(workspaceId);
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async (channelId: string) => {
    try {
      setJoiningChannels((prev) => new Set(prev).add(channelId));
      await channelService.joinChannel(workspaceId, channelId);
      toast.success('Joined channel successfully');
      onChannelJoined();
      await loadChannels(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to join channel:', error);
      toast.error(error.response?.data?.error || 'Failed to join channel');
    } finally {
      setJoiningChannels((prev) => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
    }
  };

  const filteredChannels = channels.filter((channel) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      channel.name.toLowerCase().includes(query) ||
      channel.description?.toLowerCase().includes(query)
    );
  });

  const publicChannels = filteredChannels.filter((c) => !c.isPrivate);
  const privateChannels = filteredChannels.filter((c) => c.isPrivate);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Browse Channels
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search channels..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading channels...</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {/* Public Channels */}
                    {publicChannels.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Public Channels ({publicChannels.length})
                        </h4>
                        <div className="space-y-2">
                          {publicChannels.map((channel) => (
                            <div
                              key={channel.id}
                              className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <HashtagIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="font-medium text-gray-900">{channel.name}</span>
                                  {channel.isMember && (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                      Joined
                                    </span>
                                  )}
                                </div>
                                {channel.description && (
                                  <p className="text-sm text-gray-600 mb-2">{channel.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <UsersIcon className="w-3 h-3" />
                                    <span>{channel.memberCount || 0} members</span>
                                  </div>
                                </div>
                              </div>
                              {!channel.isMember && (
                                <button
                                  onClick={() => handleJoinChannel(channel.id)}
                                  disabled={joiningChannels.has(channel.id)}
                                  className={clsx(
                                    'ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                    joiningChannels.has(channel.id)
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-primary-600 text-white hover:bg-primary-700'
                                  )}
                                >
                                  {joiningChannels.has(channel.id) ? 'Joining...' : 'Join'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Private Channels (that user is already a member of) */}
                    {privateChannels.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Private Channels ({privateChannels.length})
                        </h4>
                        <div className="space-y-2">
                          {privateChannels.map((channel) => (
                            <div
                              key={channel.id}
                              className="flex items-start justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <LockClosedIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="font-medium text-gray-900">{channel.name}</span>
                                  <span className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                                    Private
                                  </span>
                                </div>
                                {channel.description && (
                                  <p className="text-sm text-gray-600 mb-2">{channel.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <UsersIcon className="w-3 h-3" />
                                    <span>{channel.memberCount || 0} members</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredChannels.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No channels found matching your search' : 'No channels available'}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}