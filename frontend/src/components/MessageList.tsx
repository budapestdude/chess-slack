import { useEffect, useRef } from 'react';
import { Message } from '../types';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onAddReaction?: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction?: (messageId: string, emoji: string) => Promise<void>;
  onOpenThread?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => Promise<void>;
  onUnpinMessage?: (messageId: string) => Promise<void>;
  onBookmarkMessage?: (messageId: string) => void;
  onUnbookmarkMessage?: (messageId: string) => void;
  userRole?: string;
}

export default function MessageList({ messages, loading, onEditMessage, onDeleteMessage, onAddReaction, onRemoveReaction, onOpenThread, onPinMessage, onUnpinMessage, onBookmarkMessage, onUnbookmarkMessage, userRole }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No messages yet.</p>
          <p className="text-sm mt-1">Be the first to send a message!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            onOpenThread={onOpenThread}
            onPinMessage={onPinMessage}
            onUnpinMessage={onUnpinMessage}
            onBookmarkMessage={onBookmarkMessage}
            onUnbookmarkMessage={onUnbookmarkMessage}
            userRole={userRole}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}