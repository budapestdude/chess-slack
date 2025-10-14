import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Save,
  Share2,
  History,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  ChevronRight,
  MessageSquare,
  Users,
  Smile,
  X,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import {
  Document,
  updateDocument,
  toggleFavorite,
  archiveDocument,
  deleteDocument,
} from '../services/document';
import DocumentComments from './DocumentComments';
import ShareDocumentModal from './ShareDocumentModal';
import DocumentVersionHistory from './DocumentVersionHistory';

interface DocumentEditorProps {
  document: Document;
  workspaceId: string;
  currentUserId: string;
  onUpdate: (document: Document) => void;
  onDelete?: () => void;
}

/**
 * DocumentEditor Component
 * Rich text editor with Notion-like styling and features
 * Features: Auto-save, formatting toolbar, cover images, emoji icons, metadata sidebar
 */
const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  workspaceId,
  currentUserId,
  onUpdate,
  onDelete,
}) => {
  // State
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [icon, setIcon] = useState(document.icon || '');
  const [coverImage, setCoverImage] = useState(document.coverImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [showMetadataSidebar, setShowMetadataSidebar] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Refs
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Auto-save on content change
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, icon, coverImage]);

  // Update local state when document prop changes (only on document ID change, not on every update)
  useEffect(() => {
    // Only update if we're switching to a different document
    setTitle(document.title);
    setContent(document.content);
    setIcon(document.icon || '');
    setCoverImage(document.coverImageUrl || document.coverImage || '');

    // Set the initial content in the contentEditable div
    if (contentEditableRef.current && document.content) {
      contentEditableRef.current.innerHTML = document.content;
    }
  }, [document.id]);

  const handleAutoSave = async () => {
    console.log('handleAutoSave called - title:', title, 'content length:', content?.length || 0);
    if (!title && !content) {
      console.log('Skipping auto-save: both title and content are empty');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        title: title || 'Untitled',
        content: content || '',
        icon: icon || undefined,
      };

      // Only include coverImageUrl if it's a valid URL
      if (coverImage && coverImage.startsWith('http')) {
        updateData.coverImageUrl = coverImage;
      }

      console.log('Saving document:', document.id, 'updateData:', updateData);
      const updated = await updateDocument(workspaceId, document.id, updateData);
      console.log('Document saved successfully:', updated);
      setLastSaved(new Date());
      onUpdate(updated);
    } catch (error) {
      console.error('Error auto-saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const executeFormatCommand = (command: string, value: string | undefined = undefined) => {
    // execCommand is deprecated but still widely supported for contentEditable
    (document as any).execCommand(command, false, value);
    contentEditableRef.current?.focus();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Save and restore cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  };

  const restoreCursorPosition = (range: Range | null) => {
    if (range) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const handleContentInput = () => {
    if (contentEditableRef.current) {
      const range = saveCursorPosition();
      const newContent = contentEditableRef.current.innerHTML;
      console.log('handleContentInput - new content length:', newContent.length);
      setContent(newContent);
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        restoreCursorPosition(range);
      });
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    setIcon(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleToggleFavorite = async () => {
    try {
      const updated = await toggleFavorite(workspaceId, document.id);
      onUpdate(updated);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleArchive = async () => {
    if (confirm('Archive this document?')) {
      try {
        const updated = await archiveDocument(workspaceId, document.id);
        onUpdate(updated);
      } catch (error) {
        console.error('Error archiving document:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this document permanently? This cannot be undone.')) {
      try {
        await deleteDocument(workspaceId, document.id);
        onDelete?.();
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document. Please try again.');
      }
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeFormatCommand('createLink', url);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEdit = ['edit', 'admin'].includes(document.permissions);

  return (
    <div className="flex h-full bg-white">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header / Toolbar */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          {/* Breadcrumb */}
          <div className="px-16 py-3 border-b border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <span>Workspace</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span>Documents</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="text-gray-900 font-medium truncate">
                {document.title || 'Untitled'}
              </span>
            </div>
          </div>

          {/* Toolbar */}
          {canEdit && (
            <div className="px-16 py-3">
              <div className="flex items-center gap-1">
                {/* Text Formatting */}
                <button
                  onClick={() => executeFormatCommand('bold')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => executeFormatCommand('italic')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Italic"
                >
                  <Italic className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => executeFormatCommand('underline')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Underline"
                >
                  <Underline className="w-4 h-4 text-gray-700" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                {/* Headings */}
                <button
                  onClick={() => executeFormatCommand('formatBlock', 'h1')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Heading 1"
                >
                  <Heading1 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => executeFormatCommand('formatBlock', 'h2')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => executeFormatCommand('formatBlock', 'h3')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Heading 3"
                >
                  <Heading3 className="w-4 h-4 text-gray-700" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                {/* Lists */}
                <button
                  onClick={() => executeFormatCommand('insertUnorderedList')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Bullet List"
                >
                  <List className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => executeFormatCommand('insertOrderedList')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4 text-gray-700" />
                </button>

                <div className="w-px h-6 bg-gray-300 mx-2" />

                {/* Link & Code */}
                <button
                  onClick={insertLink}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Insert Link"
                >
                  <LinkIcon className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => executeFormatCommand('formatBlock', 'pre')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Code Block"
                >
                  <Code className="w-4 h-4 text-gray-700" />
                </button>

                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isSaving ? (
                    <span className="text-xs text-gray-500 flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : lastSaved ? (
                    <span className="text-xs text-gray-500">
                      Saved {formatDate(lastSaved.toISOString())}
                    </span>
                  ) : null}

                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                  >
                    <MessageSquare className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-700">Comments</span>
                  </button>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-700" />
                    </button>

                    {showMoreMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => {
                            setShowVersionHistory(true);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        >
                          <History className="w-4 h-4" />
                          Version History
                        </button>
                        <button
                          onClick={() => {
                            handleToggleFavorite();
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              document.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''
                            }`}
                          />
                          {document.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </button>
                        <button
                          onClick={() => {
                            setShowMetadataSidebar(!showMetadataSidebar);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        >
                          <Users className="w-4 h-4" />
                          Document Info
                        </button>
                        <div className="border-t border-gray-200 my-1" />
                        <button
                          onClick={() => {
                            handleArchive();
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-16 py-12">
            {/* Cover Image */}
            {coverImage && (
              <div className="mb-8 relative group -mx-16">
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-full h-64 object-cover"
                />
                {canEdit && (
                  <button
                    onClick={() => setCoverImage('')}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>
                )}
              </div>
            )}

            {/* Icon & Cover Actions */}
            {canEdit && !coverImage && (
              <div className="mb-6">
                <button
                  onClick={() => setShowCoverInput(true)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Add cover image
                </button>
                {showCoverInput && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="url"
                      placeholder="Enter image URL"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          setCoverImage(e.currentTarget.value);
                          setShowCoverInput(false);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => setShowCoverInput(false)}
                      className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Icon & Title */}
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-2">
                {/* Icon Picker */}
                <div className="relative">
                  <button
                    onClick={() => canEdit && setShowEmojiPicker(!showEmojiPicker)}
                    className={`text-6xl leading-none ${
                      canEdit ? 'hover:bg-gray-100 rounded-lg p-2 transition-colors' : ''
                    }`}
                    disabled={!canEdit}
                  >
                    {icon || <Smile className="w-16 h-16 text-gray-300" />}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-2 z-20">
                      <EmojiPicker onEmojiClick={handleEmojiSelect} />
                    </div>
                  )}
                </div>

                {/* Title */}
                <textarea
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Untitled"
                  disabled={!canEdit}
                  className="flex-1 text-5xl font-bold text-gray-900 placeholder-gray-300 resize-none border-none focus:outline-none bg-transparent disabled:cursor-not-allowed overflow-hidden"
                  rows={1}
                  style={{ minHeight: '72px' }}
                />
              </div>
            </div>

            {/* Rich Text Content */}
            <div
              ref={contentEditableRef}
              contentEditable={canEdit}
              onInput={handleContentInput}
              className={`
                prose prose-lg max-w-none min-h-[400px] focus:outline-none
                ${canEdit ? '' : 'cursor-not-allowed'}
                prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg
                prose-ul:list-disc prose-ol:list-decimal
                prose-img:rounded-lg prose-img:shadow-md
              `}
              suppressContentEditableWarning
            />
          </div>
        </div>
      </div>

      {/* Metadata Sidebar */}
      {showMetadataSidebar && (
        <aside className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Document Info</h3>
              <button
                onClick={() => setShowMetadataSidebar(false)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Metadata */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Details
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Created</span>
                    <div className="text-gray-900 mt-1">{formatDate(document.createdAt)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Last edited</span>
                    <div className="text-gray-900 mt-1">{formatDate(document.updatedAt)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Type</span>
                    <div className="text-gray-900 mt-1 capitalize">{document.type}</div>
                  </div>
                </div>
              </div>

              {/* Collaborators */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Collaborators
                  </h4>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {document.collaborators.map((collaborator) => (
                    <div
                      key={collaborator.userId}
                      className="flex items-center gap-2 p-2 bg-white rounded-lg"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {collaborator.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {collaborator.user?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {collaborator.permission}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Comments Sidebar */}
      {showComments && (
        <DocumentComments
          documentId={document.id}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Modals */}
      {showShareModal && (
        <ShareDocumentModal
          document={document}
          workspaceId={workspaceId}
          onClose={() => setShowShareModal(false)}
          onUpdate={onUpdate}
        />
      )}

      {showVersionHistory && (
        <DocumentVersionHistory
          documentId={document.id}
          workspaceId={workspaceId}
          onClose={() => setShowVersionHistory(false)}
          onRestore={(updated) => {
            onUpdate(updated);
            setShowVersionHistory(false);
          }}
        />
      )}
    </div>
  );
};

export default DocumentEditor;
