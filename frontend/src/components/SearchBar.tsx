import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { search, SearchResults } from '../services/searchService';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface SearchBarProps {
  workspaceId: string;
}

export default function SearchBar({ workspaceId }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    try {
      setLoading(true);
      const data = await search(workspaceId, query.trim());
      setResults(data);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleMessageClick = (channelId: string, messageId: string) => {
    navigate(`/workspace/${workspaceId}/channel/${channelId}`, {
      state: { scrollToMessageId: messageId },
    });
    setIsOpen(false);
    setQuery('');
    setResults(null);
  };

  const handleChannelClick = (channelId: string) => {
    navigate(`/workspace/${workspaceId}/channel/${channelId}`);
    setIsOpen(false);
    setQuery('');
    setResults(null);
  };

  return (
    <>
      {/* Search button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        <MagnifyingGlassIcon className="w-4 h-4" />
        <span>Search</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-white border border-gray-300 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4">
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages, channels, and people..."
                className="flex-1 text-lg outline-none"
              />
              {loading && (
                <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  setResults(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {results && results.totalResults > 0 ? (
                <div className="p-4 space-y-4">
                  {/* Messages */}
                  {results.results.messages.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Messages ({results.results.messages.length})
                      </h3>
                      <div className="space-y-2">
                        {results.results.messages.map((message) => (
                          <button
                            key={message.id}
                            onClick={() => handleMessageClick(message.channelId, message.id)}
                            className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">
                                {message.user.displayName}
                              </span>
                              <span className="text-xs text-gray-500">
                                in #{message.channelName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">{message.content}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Channels */}
                  {results.results.channels.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Channels ({results.results.channels.length})
                      </h3>
                      <div className="space-y-2">
                        {results.results.channels.map((channel) => (
                          <button
                            key={channel.id}
                            onClick={() => handleChannelClick(channel.id)}
                            className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">
                                #{channel.name}
                              </span>
                              {channel.isPrivate && (
                                <span className="text-xs text-gray-500">(Private)</span>
                              )}
                              {!channel.isMember && (
                                <span className="text-xs text-primary-600">(Not a member)</span>
                              )}
                            </div>
                            {channel.description && (
                              <p className="text-sm text-gray-600">{channel.description}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Users */}
                  {results.results.users.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        People ({results.results.users.length})
                      </h3>
                      <div className="space-y-2">
                        {results.results.users.map((user) => (
                          <div
                            key={user.id}
                            className="p-3 bg-gray-50 rounded-md flex items-center gap-3"
                          >
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="w-10 h-10 rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-primary-600 flex items-center justify-center text-white font-semibold">
                                {user.displayName?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {user.displayName}
                              </div>
                              <div className="text-xs text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : results && results.totalResults === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No results found for "{query}"
                </div>
              ) : query.trim() && !loading ? (
                <div className="p-8 text-center text-gray-500">Start typing to search...</div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Search for messages, channels, or people</p>
                  <p className="text-sm mt-1">Try searching for keywords or @mentions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
