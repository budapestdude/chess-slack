import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Message } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { EllipsisVerticalIcon, PencilIcon, TrashIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import MessageReactions from './MessageReactions';
import EmojiPicker from './EmojiPicker';
import AttachmentDisplay from './AttachmentDisplay';
import ChessMessage from './ChessMessage';
import { renderMentions } from '../utils/mentionParser';

interface MessageItemProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction?: (messageId: string, emoji: string) => Promise<void>;
  onOpenThread?: (messageId: string) => void;
}

export default function MessageItem({ message, onEdit, onDelete, onAddReaction, onRemoveReaction, onOpenThread }: MessageItemProps) {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [loading, setLoading] = useState(false);

  const isOwnMessage = currentUser?.id === message.userId;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onEdit?.(message.id, editContent.trim());
      setIsEditing(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    setLoading(true);
    try {
      await onDelete?.(message.id);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  if (message.isDeleted) {
    return (
      <div className="flex gap-3 py-2 px-4 hover:bg-gray-50 text-gray-500 italic">
        <div className="w-10"></div>
        <div>[Message deleted]</div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-2 px-4 hover:bg-gray-50 group relative">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.user?.avatarUrl ? (
          <img
            src={message.user.avatarUrl}
            alt={message.user.displayName}
            className="w-10 h-10 rounded"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-primary-600 flex items-center justify-center text-white font-semibold">
            {getInitials(message.user?.displayName || message.user?.username || 'U')}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-gray-900">
            {message.user?.displayName || message.user?.username}
          </span>
          <span className="text-xs text-gray-500">
            {formatTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-500">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={3}
              disabled={loading}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEdit}
                disabled={loading || !editContent.trim()}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
                disabled={loading}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-gray-900 whitespace-pre-wrap break-words">
              {renderMentions(message.content)}
            </div>

            {/* Chess Game */}
            {message.messageType === 'chess_game' && (
              <ChessMessage
                pgn={message.metadata?.pgn}
                fen={message.metadata?.fen}
                description={message.metadata?.description}
                compact={true}
              />
            )}

            {/* Attachments */}
            {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
              <AttachmentDisplay
                attachments={message.attachments}
                workspaceId={message.workspaceId}
                channelId={message.channelId || ''}
                messageId={message.id}
              />
            )}
          </>
        )}

        {!message.parentMessageId && message.replyCount !== undefined && message.replyCount > 0 && !isEditing && (
          <button
            onClick={() => onOpenThread?.(message.id)}
            className="flex items-center gap-2 mt-2 px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-md transition-colors border border-primary-200"
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            <span className="font-medium">
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {message.lastReplyAt && (
              <span className="text-gray-500">
                · Last reply {formatTime(message.lastReplyAt)}
              </span>
            )}
          </button>
        )}

        {/* Reactions */}
        {!isEditing && (
          <MessageReactions
            messageId={message.id}
            reactions={message.reactions || []}
            currentUserId={currentUser?.id || ''}
            onAddReaction={(emoji) => onAddReaction?.(message.id, emoji)}
            onRemoveReaction={(emoji) => onRemoveReaction?.(message.id, emoji)}
          />
        )}
      </div>

      {/* Message Actions Menu */}
      {!isEditing && (
        <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-gray-200 rounded shadow-sm">
          {/* Emoji Picker */}
          <EmojiPicker onEmojiSelect={(emoji) => onAddReaction?.(message.id, emoji)} />

          {/* Edit/Delete Menu (only for own messages) */}
          {isOwnMessage && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-200 rounded"
                title="Message actions"
              >
                <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}