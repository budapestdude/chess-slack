import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Edit2,
  Trash2,
  Check,
  MoreVertical,
  Reply,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  Comment,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  toggleResolveComment,
} from '../services/document';

interface DocumentCommentsProps {
  documentId: string;
  workspaceId: string;
  currentUserId: string;
  onClose: () => void;
}

/**
 * DocumentComments Component
 * Threaded comment system for document collaboration
 * Features: Nested replies, edit/delete, resolve/unresolve, user avatars
 */
const DocumentComments: React.FC<DocumentCommentsProps> = ({
  documentId,
  workspaceId,
  currentUserId,
  onClose,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [documentId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getComments(workspaceId, documentId);
      // Organize comments into threads
      const organized = organizeComments(data);
      setComments(organized);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const organizeComments = (commentList: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map
    commentList.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree
    commentList.forEach((comment) => {
      const commentNode = commentMap.get(comment.id)!;
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    return rootComments;
  };

  const handleAddComment = async (parentId?: string) => {
    const text = parentId ? editText : newCommentText;
    if (!text.trim()) return;

    try {
      await addComment(workspaceId, documentId, text, parentId);
      setNewCommentText('');
      setEditText('');
      setReplyTo(null);
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      await updateComment(workspaceId, documentId, commentId, editText);
      setEditingComment(null);
      setEditText('');
      await loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await deleteComment(workspaceId, documentId, commentId);
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleToggleResolve = async (commentId: string) => {
    try {
      await toggleResolveComment(workspaceId, documentId, commentId);
      await loadComments();
    } catch (error) {
      console.error('Error toggling resolve:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingComment === comment.id;
    const isReplying = replyTo === comment.id;
    const isAuthor = comment.userId === currentUserId;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const [showReplies, setShowReplies] = useState(true);

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {comment.user?.name?.charAt(0) || '?'}
            </div>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-lg p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.createdAt)}
                  </span>
                  {comment.isResolved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolved
                    </span>
                  )}
                </div>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveMenu(activeMenu === comment.id ? null : comment.id)
                    }
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>

                  {activeMenu === comment.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          handleToggleResolve(comment.id);
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700"
                      >
                        {comment.isResolved ? (
                          <>
                            <Circle className="w-4 h-4" />
                            Unresolve
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Resolve
                          </>
                        )}
                      </button>
                      {isAuthor && (
                        <>
                          <button
                            onClick={() => {
                              setEditingComment(comment.id);
                              setEditText(comment.content);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteComment(comment.id);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-sm text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Comment Text */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditText('');
                      }}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </p>
              )}
            </div>

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    setReplyTo(comment.id);
                    setEditText('');
                  }}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
                {hasReplies && (
                  <button
                    onClick={() => setShowReplies(!showReplies)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {showReplies ? (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Hide {comment.replies!.length} replies
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-3 h-3" />
                        Show {comment.replies!.length} replies
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Reply Input */}
            {isReplying && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddComment(comment.id)}
                    disabled={!editText.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyTo(null);
                      setEditText('');
                    }}
                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nested Replies */}
        {hasReplies && showReplies && (
          <div className="mt-2">
            {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const unresolvedComments = comments.filter((c) => !c.isResolved);
  const resolvedComments = comments.filter((c) => c.isResolved);

  return (
    <aside className="w-96 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({unresolvedComments.length})
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Unresolved Comments */}
            {unresolvedComments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">No comments yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Start the conversation below
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {unresolvedComments.map((comment) => renderComment(comment))}
              </div>
            )}

            {/* Resolved Comments */}
            {resolvedComments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowResolved(!showResolved)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-4"
                >
                  {showResolved ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Resolved ({resolvedComments.length})
                </button>
                {showResolved && (
                  <div className="space-y-1 opacity-60">
                    {resolvedComments.map((comment) => renderComment(comment))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Comment Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {newCommentText.length}/1000
          </span>
          <button
            onClick={() => handleAddComment()}
            disabled={!newCommentText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Comment
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DocumentComments;
