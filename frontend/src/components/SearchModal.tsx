import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { search } from '../services/searchService';
import { formatDistanceToNow } from 'date-fns';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export default function SearchModal({ isOpen, onClose, workspaceId }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'messages' | 'channels' | 'users'>('all');
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  const workspace = workspaceId || currentWorkspace?.id;

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(null);
      setSelectedTab('all');
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.trim().length >= 2 && workspace) {
        setLoading(true);
        try {
          const searchResults = await search(workspace, query, { type: selectedTab });
          setResults(searchResults);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, workspace, selectedTab]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'messages', label: 'Messages' },
    { id: 'channels', label: 'Channels' },
    { id: 'users', label: 'Users' },
  ];

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
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-[10vh]">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Search Input */}
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full border-0 border-b border-gray-200 bg-transparent py-4 pl-12 pr-12 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 text-lg"
                    placeholder="Search messages, channels, and people..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-gray-50 px-4">
                  <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as any)}
                        className={`${
                          selectedTab === tab.id
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium`}
                      >
                        {tab.label}
                        {results && results.results && tab.id !== 'all' && (
                          <span className="ml-2 text-xs">
                            ({results.results[tab.id]?.length || 0})
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Searching...</div>
                    </div>
                  )}

                  {!loading && query.trim().length < 2 && (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center text-gray-500">
                        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                        <p>Type at least 2 characters to search</p>
                        <p className="text-xs mt-1">Use Cmd+K or Ctrl+K to open search</p>
                      </div>
                    </div>
                  )}

                  {!loading && results && results.totalResults === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">No results found for "{query}"</div>
                    </div>
                  )}

                  {!loading && results && results.totalResults > 0 && (
                    <div className="divide-y divide-gray-100">
                      {/* Messages */}
                      {(selectedTab === 'all' || selectedTab === 'messages') &&
                        results.results.messages.length > 0 && (
                          <div className="p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                              Messages
                            </h3>
                            <div className="space-y-3">
                              {results.results.messages.map((message: any) => (
                                <div
                                  key={message.id}
                                  className="flex gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
                                    // Navigate to message
                                    onClose();
                                  }}
                                >
                                  {message.user.avatarUrl ? (
                                    <img
                                      src={message.user.avatarUrl}
                                      alt={message.user.displayName}
                                      className="w-8 h-8 rounded"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                                      {getInitials(message.user.displayName)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {message.user.displayName}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        in #{message.channelName}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {formatDistanceToNow(new Date(message.createdAt), {
                                          addSuffix: true,
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">
                                      {message.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Channels */}
                      {(selectedTab === 'all' || selectedTab === 'channels') &&
                        results.results.channels.length > 0 && (
                          <div className="p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                              Channels
                            </h3>
                            <div className="space-y-2">
                              {results.results.channels.map((channel: any) => (
                                <div
                                  key={channel.id}
                                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
                                    // Navigate to channel
                                    onClose();
                                  }}
                                >
                                  <div className="text-xl">#</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {channel.name}
                                      </span>
                                      {channel.isPrivate && (
                                        <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                                          Private
                                        </span>
                                      )}
                                      {channel.isMember && (
                                        <span className="text-xs text-green-600">Joined</span>
                                      )}
                                    </div>
                                    {channel.description && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {channel.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Users */}
                      {(selectedTab === 'all' || selectedTab === 'users') &&
                        results.results.users.length > 0 && (
                          <div className="p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">People</h3>
                            <div className="space-y-2">
                              {results.results.users.map((user: any) => (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
                                    // Open DM or profile
                                    onClose();
                                  }}
                                >
                                  {user.avatarUrl ? (
                                    <img
                                      src={user.avatarUrl}
                                      alt={user.displayName}
                                      className="w-8 h-8 rounded"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                                      {getInitials(user.displayName)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900">
                                      {user.displayName}
                                    </div>
                                    <div className="text-xs text-gray-500">@{user.username}</div>
                                  </div>
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      user.status === 'online'
                                        ? 'bg-green-500'
                                        : user.status === 'away'
                                        ? 'bg-yellow-500'
                                        : 'bg-gray-400'
                                    }`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Footer hint */}
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between">
                  <span>Press ESC to close</span>
                  <span>Cmd+K or Ctrl+K to open search</span>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}