import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Message } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import { threadService } from '../services/thread';
import websocketService from '../services/websocket';
import toast from 'react-hot-toast';

interface ThreadPanelProps {
  messageId: string;
  workspaceId: string;
  channelId: string;
  onClose: () => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction?: (messageId: string, emoji: string) => Promise<void>;
}

export default function ThreadPanel({
  messageId,
  workspaceId,
  channelId,
  onClose,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
}: ThreadPanelProps) {
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadThread();
    scrollToBottom();
  }, [messageId]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  useEffect(() => {
    // Listen for new replies in this thread
    const handleNewMessage = (message: Message) => {
      if (message.parentMessageId === messageId) {
        setReplies((prev) => [...prev, message]);
      }
    };

    // Listen for thread-reply event to update parent message reply count
    const handleThreadReply = (data: { parentMessageId: string; replyCount: number; lastReplyAt: string }) => {
      if (data.parentMessageId === messageId) {
        setParentMessage((prev) =>
          prev ? { ...prev, replyCount: data.replyCount, lastReplyAt: data.lastReplyAt } : prev
        );
      }
    };

    websocketService.onNewMessage(handleNewMessage);
    // Note: thread-reply listener would need to be added to websocketService if needed

    return () => {
      websocketService.offNewMessage();
    };
  }, [messageId]);

  const loadThread = async () => {
    try {
      setLoading(true);
      const data = await threadService.getThreadReplies(workspaceId, channelId, messageId);
      setParentMessage(data.parentMessage);
      setReplies(data.replies);
    } catch (error: any) {
      console.error('Failed to load thread:', error);
      toast.error('Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (content: string) => {
    try {
      await threadService.postThreadReply(workspaceId, channelId, messageId, content);
      // Reply will be added via WebSocket event
    } catch (error: any) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="w-96 border-l border-gray-200 flex items-center justify-center bg-white">
        <div className="text-gray-500">Loading thread...</div>
      </div>
    );
  }

  if (!parentMessage) {
    return (
      <div className="w-96 border-l border-gray-200 flex items-center justify-center bg-white">
        <div className="text-gray-500">Thread not found</div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-gray-200 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Thread</h2>
          {replies.length > 0 && (
            <span className="text-sm text-gray-500">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Close thread"
        >
          <XMarkIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Parent Message */}
      <div className="border-b border-gray-200 bg-gray-50">
        <MessageItem
          message={parentMessage}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto">
        {replies.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm px-4 text-center">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          <div className="flex flex-col">
            {replies.map((reply) => (
              <MessageItem
                key={reply.id}
                message={reply}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Input */}
      <MessageInput
        channelName={`thread`}
        workspaceId={workspaceId}
        channelId={channelId}
        parentMessageId={messageId}
        onSendMessage={handleSendReply}
        onTyping={() => {}}
        onStopTyping={() => {}}
      />
    </div>
  );
}