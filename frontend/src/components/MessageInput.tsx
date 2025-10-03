import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { RootState } from '../store';
import { workspaceService } from '../services/workspace';
import { attachmentService } from '../services/attachment';
import { draftService } from '../services/draft';
import MentionAutocomplete from './MentionAutocomplete';
import FileUploadButton from './FileUploadButton';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: string;
}

interface MessageInputProps {
  channelName: string;
  workspaceId: string;
  channelId: string;
  parentMessageId?: string;
  onSendMessage: (content: string) => Promise<void>;
  onTyping: () => void;
  onStopTyping: () => void;
}

export default function MessageInput({
  channelName,
  workspaceId,
  channelId,
  parentMessageId,
  onSendMessage,
  onTyping,
  onStopTyping,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const typingTimeoutRef = useRef<number | null>(null);
  const draftTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  useEffect(() => {
    // Load workspace members
    if (currentWorkspace?.id) {
      workspaceService.getWorkspaceMembers(currentWorkspace.id).then(setWorkspaceMembers);
    }
  }, [currentWorkspace?.id]);

  // Load draft when channel changes
  useEffect(() => {
    const loadDraft = async () => {
      if (!workspaceId || !channelId) return;

      try {
        const draft = await draftService.getDraft(workspaceId, channelId);
        if (draft && draft.content) {
          setContent(draft.content);
          setDraftStatus('saved');
        } else {
          setContent('');
          setDraftStatus('idle');
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    };

    loadDraft();
  }, [workspaceId, channelId]);

  // Auto-save draft
  const saveDraft = async (text: string) => {
    if (!text.trim() || !workspaceId || !channelId) {
      setDraftStatus('idle');
      return;
    }

    try {
      setDraftStatus('saving');
      await draftService.saveDraft(workspaceId, text, channelId);
      setDraftStatus('saved');

      // Reset status after 2 seconds
      setTimeout(() => {
        setDraftStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setDraftStatus('idle');
    }
  };

  const getCursorPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();

    return {
      top: rect.top - 300, // Position above textarea
      left: rect.left,
    };
  };

  const handleContentChange = (value: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    setContent(value);

    // Check for @ mention trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @ (still typing the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setMentionStartPos(lastAtIndex);
        setMentionPosition(getCursorPosition());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    // Trigger typing indicator
    onTyping();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);

    // Auto-save draft with debouncing
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    // Save draft after 2 seconds of inactivity
    draftTimeoutRef.current = setTimeout(() => {
      saveDraft(value);
    }, 2000);
  };

  const handleMentionSelect = (user: User) => {
    if (mentionStartPos === null) return;

    // Replace @search with @username
    const beforeMention = content.substring(0, mentionStartPos);
    const afterMention = content.substring(textareaRef.current?.selectionStart || content.length);
    const newContent = `${beforeMention}@${user.username} ${afterMention}`;

    setContent(newContent);
    setShowMentions(false);
    setMentionStartPos(null);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if ((!content.trim() && selectedFiles.length === 0) || sending) {
      return;
    }

    setSending(true);
    onStopTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    try {
      // If files are selected, use upload endpoint
      if (selectedFiles.length > 0) {
        await attachmentService.uploadMessageWithAttachments(
          workspaceId,
          channelId,
          selectedFiles,
          content.trim() || undefined,
          parentMessageId
        );
        setSelectedFiles([]);
      } else {
        // Otherwise use regular message endpoint
        await onSendMessage(content.trim());
      }

      // Delete draft after successful send
      try {
        await draftService.deleteDraftByLocation(workspaceId, channelId);
      } catch (error) {
        // Non-critical, ignore
        console.error('Failed to delete draft:', error);
      }

      setContent('');
      setDraftStatus('idle');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention autocomplete is open, let it handle arrow keys and Enter
    if (showMentions && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      return;
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
      onStopTyping();
    };
  }, [onStopTyping]);

  return (
    <div className="border-t border-gray-200 p-4 relative">
      {showMentions && (
        <MentionAutocomplete
          users={workspaceMembers}
          position={mentionPosition}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentions(false)}
          searchTerm={mentionSearch}
        />
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2 items-end">
          <FileUploadButton
            selectedFiles={selectedFiles}
            onFilesSelected={setSelectedFiles}
            onRemoveFile={handleRemoveFile}
            disabled={sending}
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={1}
            style={{
              minHeight: '42px',
              maxHeight: '200px',
            }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={(!content.trim() && selectedFiles.length === 0) || sending}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </p>
          {draftStatus === 'saving' && (
            <p className="text-xs text-gray-400 italic">Saving draft...</p>
          )}
          {draftStatus === 'saved' && (
            <p className="text-xs text-green-600 italic">Draft saved</p>
          )}
        </div>
      </form>
    </div>
  );
}