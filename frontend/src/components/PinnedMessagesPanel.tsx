import { useState } from 'react';
import { Message } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

interface PinnedMessagesPanelProps {
  pinnedMessages: Message[];
  userRole?: string;
  onUnpinMessage?: (messageId: string) => Promise<void>;
  onJumpToMessage?: (messageId: string) => void;
}

export default function PinnedMessagesPanel({
  pinnedMessages,
  userRole,
  onUnpinMessage,
  onJumpToMessage,
}: PinnedMessagesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [unpinningId, setUnpinningId] = useState<string | null>(null);

  const canUnpin = userRole === 'admin' || userRole === 'owner';

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const handleUnpin = async (messageId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canUnpin || !onUnpinMessage) return;

    setUnpinningId(messageId);
    try {
      await onUnpinMessage(messageId);
    } catch (error) {
      console.error('Failed to unpin message:', error);
    } finally {
      setUnpinningId(null);
    }
  };

  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-amber-900 font-medium">
          <BookmarkSolidIcon className="w-5 h-5" />
          <span>
            {pinnedMessages.length} {pinnedMessages.length === 1 ? 'pinned message' : 'pinned messages'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-amber-700" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-amber-700" />
        )}
      </button>

      {/* Pinned Messages List */}
      {isExpanded && (
        <div className="px-6 pb-4 space-y-2">
          {pinnedMessages.map((message) => (
            <div
              key={message.id}
              className="bg-white rounded-lg border border-amber-200 p-3 hover:border-amber-300 transition-colors cursor-pointer group"
              onClick={() => onJumpToMessage?.(message.id)}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {message.user?.displayName || message.user?.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2 whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  {message.pinnedAt && (
                    <div className="text-xs text-amber-600 mt-1">
                      Pinned {formatTime(message.pinnedAt)}
                    </div>
                  )}
                </div>

                {/* Unpin Button */}
                {canUnpin && (
                  <button
                    onClick={(e) => handleUnpin(message.id, e)}
                    disabled={unpinningId === message.id}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Unpin message"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}