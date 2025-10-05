import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Channel, Message } from '../types';
import { HashtagIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThreadPanel from './ThreadPanel';
import PinnedMessagesPanel from './PinnedMessagesPanel';
import { messageService } from '../services/message';
import { bookmarksService } from '../services/bookmarks';
import websocketService from '../services/websocket';
import toast from 'react-hot-toast';

interface ChannelViewProps {
  channel: Channel;
  workspaceId: string;
}

export default function ChannelView({ channel, workspaceId }: ChannelViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
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
      websocketService.onMessagePinned(handleMessagePinned);
      websocketService.onMessageUnpinned(handleMessageUnpinned);

      // IMPORTANT: Wait for channel join to complete before allowing messages
      // This prevents race condition where user sends message before socket joins room
      console.log('Joining channel:', channel.id);
      const joined = await websocketService.joinChannel(channel.id);
      console.log('Channel join complete:', channel.id, 'success:', joined);

      if (!joined) {
        console.error('Failed to join channel room, real-time updates may not work');
      }

      // Fetch initial messages and pinned messages after joining channel
      loadMessages();
      loadPinnedMessages();
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
      websocketService.offMessagePinned();
      websocketService.offMessageUnpinned();
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

  const loadPinnedMessages = async () => {
    try {
      const data = await messageService.getPinnedMessages(workspaceId, channel.id);
      setPinnedMessages(data.pinnedMessages);
    } catch (error: any) {
      console.error('Failed to load pinned messages:', error);
      // Don't show error toast for pinned messages, just log it
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
        prev.map((m) => (m.id === message.id ? { ...m, ...message, isEdited: true } : m))
      );
      toast.success('Message updated');
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

  const handlePinMessage = async (messageId: string) => {
    try {
      await messageService.pinMessage(messageId);
      toast.success('Message pinned');
      // Message will be updated via WebSocket event
    } catch (error: any) {
      console.error('Failed to pin message:', error);
      toast.error('Failed to pin message');
      throw error;
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await messageService.unpinMessage(messageId);
      toast.success('Message unpinned');
      // Message will be updated via WebSocket event
    } catch (error: any) {
      console.error('Failed to unpin message:', error);
      toast.error('Failed to unpin message');
      throw error;
    }
  };

  const handleMessagePinned = (data: { messageId: string; message: Message }) => {
    // Update the message in the messages list
    setMessages((prev) =>
      prev.map((m) => (m.id === data.messageId ? { ...m, isPinned: true, pinnedAt: data.message.pinnedAt, pinnedBy: data.message.pinnedBy } : m))
    );
    // Add to pinned messages list
    setPinnedMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === data.messageId)) {
        return prev;
      }
      return [...prev, data.message];
    });
  };

  const handleMessageUnpinned = (data: { messageId: string }) => {
    // Update the message in the messages list
    setMessages((prev) =>
      prev.map((m) => (m.id === data.messageId ? { ...m, isPinned: false, pinnedAt: undefined, pinnedBy: undefined } : m))
    );
    // Remove from pinned messages list
    setPinnedMessages((prev) => prev.filter((m) => m.id !== data.messageId));
  };

  const handleBookmarkMessage = async (messageId: string) => {
    try {
      await bookmarksService.bookmarkMessage(messageId);
      toast.success('Message bookmarked');
      loadMessages(); // Refresh to show bookmark indicator
    } catch (error: any) {
      console.error('Failed to bookmark message:', error);
      toast.error('Failed to bookmark message');
    }
  };

  const handleUnbookmarkMessage = async (messageId: string) => {
    try {
      await bookmarksService.unbookmarkMessage(messageId);
      toast.success('Bookmark removed');
      loadMessages(); // Refresh to remove bookmark indicator
    } catch (error: any) {
      console.error('Failed to remove bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };

  return (
    <div className="flex h-full">
      {/* Main channel area */}
      <div className="flex-1 flex flex-col">
        {/* Pinned Messages Panel */}
        {pinnedMessages.length > 0 && (
          <PinnedMessagesPanel
            pinnedMessages={pinnedMessages}
            userRole={channel.userRole}
            onUnpinMessage={handleUnpinMessage}
            onJumpToMessage={(messageId) => {
              // Scroll to message in the list
              const element = document.getElementById(`message-${messageId}`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        )}

        {/* Messages area */}
        <MessageList
          messages={messages}
          loading={loading}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
          onOpenThread={setOpenThreadId}
          onPinMessage={handlePinMessage}
          onUnpinMessage={handleUnpinMessage}
          onBookmarkMessage={handleBookmarkMessage}
          onUnbookmarkMessage={handleUnbookmarkMessage}
          userRole={channel.userRole}
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