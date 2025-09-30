import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Channel, Message } from '../types';
import { HashtagIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThreadPanel from './ThreadPanel';
import { messageService } from '../services/message';
import websocketService from '../services/websocket';
import toast from 'react-hot-toast';

interface ChannelViewProps {
  channel: Channel;
  workspaceId: string;
}

export default function ChannelView({ channel, workspaceId }: ChannelViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const { token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Initialize WebSocket connection and channel
    const initializeChannel = async () => {
      if (token) {
        websocketService.connect(token);
      }

      // Set up WebSocket listeners BEFORE joining channel
      // This ensures we don't miss any events
      websocketService.onNewMessage(handleNewMessage);
      websocketService.onMessageUpdated(handleMessageUpdated);
      websocketService.onMessageDeleted(handleMessageDeleted);
      websocketService.onUserTyping(handleUserTyping);
      websocketService.onUserStopTyping(handleUserStopTyping);
      websocketService.onReactionAdded(handleReactionAdded);
      websocketService.onReactionRemoved(handleReactionRemoved);

      // Join channel room and wait for confirmation
      await websocketService.joinChannel(channel.id);
      console.log('Channel joined, ready to receive messages');

      // Fetch initial messages after joining
      loadMessages();
    };

    initializeChannel();

    return () => {
      // Clean up
      websocketService.leaveChannel(channel.id);
      websocketService.offNewMessage();
      websocketService.offMessageUpdated();
      websocketService.offMessageDeleted();
      websocketService.offUserTyping();
      websocketService.offUserStopTyping();
      websocketService.offReactionAdded();
      websocketService.offReactionRemoved();
    };
  }, [channel.id, token]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await messageService.getMessages(workspaceId, channel.id);
      setMessages(data.messages);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      await messageService.sendMessage(workspaceId, channel.id, content);
      // Message will be added via WebSocket event
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  const handleNewMessage = (message: Message) => {
    console.log('Received new-message event:', message.id, 'for channel:', message.channelId);
    if (message.channelId === channel.id) {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) {
          console.log('Duplicate message detected, skipping:', message.id);
          return prev;
        }
        console.log('Adding new message to state:', message.id);
        return [...prev, message];
      });
    } else {
      console.log('Message for different channel, ignoring');
    }
  };

  const handleMessageUpdated = (message: Message) => {
    if (message.channelId === channel.id) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    }
  };

  const handleMessageDeleted = (data: { id: string; channelId: string }) => {
    if (data.channelId === channel.id) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? { ...m, isDeleted: true, content: '[deleted]' }
            : m
        )
      );
    }
  };

  const handleUserTyping = (data: { user: any; channelId: string }) => {
    if (data.channelId === channel.id) {
      setTypingUsers((prev) => new Set(prev).add(data.user.username));
    }
  };

  const handleUserStopTyping = (data: { user: any; channelId: string }) => {
    if (data.channelId === channel.id) {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.user.username);
        return next;
      });
    }
  };

  const handleTyping = () => {
    websocketService.sendTyping(channel.id);
  };

  const handleStopTyping = () => {
    websocketService.stopTyping(channel.id);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await messageService.editMessage(messageId, newContent);
      // Message will be updated via WebSocket event
    } catch (error: any) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
      throw error;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageService.deleteMessage(messageId);
      // Message will be updated via WebSocket event
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      throw error;
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await messageService.addReaction(messageId, emoji);
      // Reaction will be added via WebSocket event
    } catch (error: any) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
      throw error;
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      await messageService.removeReaction(messageId, emoji);
      // Reaction will be removed via WebSocket event
    } catch (error: any) {
      console.error('Failed to remove reaction:', error);
      toast.error('Failed to remove reaction');
      throw error;
    }
  };

  const handleReactionAdded = (data: { messageId: string; reaction: any }) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === data.messageId) {
          const reactions = m.reactions || [];
          return { ...m, reactions: [...reactions, data.reaction] };
        }
        return m;
      })
    );
  };

  const handleReactionRemoved = (data: { messageId: string; emoji: string; userId: string }) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === data.messageId) {
          const reactions = (m.reactions || []).filter(
            (r) => !(r.emoji === data.emoji && r.userId === data.userId)
          );
          return { ...m, reactions };
        }
        return m;
      })
    );
  };

  return (
    <div className="flex h-full">
      {/* Main channel area */}
      <div className="flex-1 flex flex-col">
        {/* Channel header */}
        <div className="h-14 border-b border-gray-200 flex items-center px-6">
          <div className="flex items-center gap-2">
            {channel.isPrivate ? (
              <LockClosedIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <HashtagIcon className="w-5 h-5 text-gray-600" />
            )}
            <h2 className="text-lg font-semibold">{channel.name}</h2>
          </div>
          {channel.topic && (
            <span className="ml-4 text-sm text-gray-600 truncate">{channel.topic}</span>
          )}
        </div>

        {/* Messages area */}
        <MessageList
          messages={messages}
          loading={loading}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
          onOpenThread={setOpenThreadId}
        />

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-6 py-1 text-sm text-gray-500 italic">
            {Array.from(typingUsers).join(', ')}{' '}
            {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Message input */}
        <MessageInput
          channelName={channel.name}
          workspaceId={workspaceId}
          channelId={channel.id}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
        />
      </div>

      {/* Thread panel */}
      {openThreadId && (
        <ThreadPanel
          messageId={openThreadId}
          workspaceId={workspaceId}
          channelId={channel.id}
          onClose={() => setOpenThreadId(null)}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
        />
      )}
    </div>
  );
}