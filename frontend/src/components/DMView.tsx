import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { DMGroup, DMMessage, dmService } from '../services/dm';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThreadPanel from './ThreadPanel';
import websocketService from '../services/websocket';
import toast from 'react-hot-toast';

interface DMViewProps {
  dmGroup: DMGroup;
  workspaceId: string;
}

export default function DMView({ dmGroup, workspaceId }: DMViewProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const { token, user: currentUser } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const initializeDM = async () => {
      if (token) {
        websocketService.connect(token);
      }

      // Set up WebSocket listeners
      websocketService.onNewMessage(handleNewMessage);
      websocketService.onMessageUpdated(handleMessageUpdated);
      websocketService.onMessageDeleted((data: { id: string; channelId: string }) => {
        // Adapt channelId to dmGroupId for DM context
        handleMessageDeleted({ id: data.id, dmGroupId: data.channelId });
      });
      websocketService.onReactionAdded(handleReactionAdded);
      websocketService.onReactionRemoved(handleReactionRemoved);

      // IMPORTANT: Wait for DM join to complete before allowing messages
      // This prevents race condition where user sends message before socket joins room
      console.log('Joining DM:', dmGroup.id);
      const joined = await websocketService.joinDM(dmGroup.id);
      console.log('DM join complete:', dmGroup.id, 'success:', joined);

      if (!joined) {
        console.error('Failed to join DM room, real-time updates may not work');
      }

      // Fetch initial messages after joining DM
      loadMessages();
    };

    initializeDM();

    return () => {
      websocketService.leaveDM(dmGroup.id);
      websocketService.offNewMessage();
      websocketService.offMessageUpdated();
      websocketService.offMessageDeleted();
      websocketService.offReactionAdded();
      websocketService.offReactionRemoved();
    };
  }, [dmGroup.id, token]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await dmService.getDMMessages(dmGroup.id);
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
      await dmService.sendDMMessage(dmGroup.id, content);
      // Message will be added via WebSocket event
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  const handleNewMessage = (message: any) => {
    console.log('Received new-message event:', message.id, 'for DM:', message.dmGroupId);
    if (message.dmGroupId === dmGroup.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          console.log('Duplicate message detected, skipping:', message.id);
          return prev;
        }
        console.log('Adding new message to state:', message.id);
        return [...prev, message];
      });
    }
  };

  const handleMessageUpdated = (message: any) => {
    if (message.dmGroupId === dmGroup.id) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, ...message, isEdited: true } : m))
      );
      toast.success('Message updated');
    }
  };

  const handleMessageDeleted = (data: { id: string; dmGroupId: string }) => {
    if (data.dmGroupId === dmGroup.id) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? { ...m, isDeleted: true, content: '[deleted]' }
            : m
        )
      );
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      // Use message service - will need to add DM support
      // For now, placeholder
      console.log('Edit message not yet implemented for DMs');
      toast.error('Edit not yet implemented for DMs');
    } catch (error: any) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
      throw error;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Use message service - will need to add DM support
      console.log('Delete message not yet implemented for DMs');
      toast.error('Delete not yet implemented for DMs');
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      throw error;
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      // Use message service - will need to add DM support
      console.log('Add reaction not yet implemented for DMs');
      toast.error('Reactions not yet implemented for DMs');
    } catch (error: any) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
      throw error;
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      // Use message service - will need to add DM support
      console.log('Remove reaction not yet implemented for DMs');
      toast.error('Reactions not yet implemented for DMs');
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

  const getDMDisplayName = () => {
    if (dmGroup.isGroup) {
      return dmGroup.members.map((m) => m.displayName).join(', ');
    }
    // For 1-on-1, show the other person's name
    const otherMember = dmGroup.members.find((m) => m.id !== currentUser?.id);
    return otherMember?.displayName || 'Unknown';
  };

  return (
    <div className="flex h-full">
      {/* Main DM area */}
      <div className="flex-1 flex flex-col">
        {/* Messages area */}
        <MessageList
          messages={messages as any}
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
          channelName={getDMDisplayName()}
          workspaceId={workspaceId}
          channelId={dmGroup.id}
          onSendMessage={handleSendMessage}
          onTyping={() => {}}
          onStopTyping={() => {}}
        />
      </div>

      {/* Thread panel */}
      {openThreadId && (
        <ThreadPanel
          messageId={openThreadId}
          workspaceId={workspaceId}
          channelId={dmGroup.id}
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