import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon as UnderlineIconLucide,
  StrikethroughIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  LinkIcon,
  ImageIcon,
  TableIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  HighlighterIcon,
  UndoIcon,
  RedoIcon,
  SaveIcon,
  DownloadIcon,
  Share2Icon,
  ClockIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';

interface EnhancedDocumentEditorProps {
  documentId: string;
  workspaceId: string;
  initialTitle: string;
  initialContent: string;
  permission: 'view' | 'comment' | 'edit' | 'admin';
  onSave: (title: string, content: string) => Promise<void>;
  onExport?: (format: 'pdf' | 'markdown' | 'html') => void;
  onShare?: () => void;
  onComments?: () => void;
  onVersionHistory?: () => void;
}

export default function EnhancedDocumentEditor({
  documentId,
  workspaceId,
  initialTitle,
  initialContent,
  permission,
  onSave,
  onExport,
  onShare,
  onComments,
  onVersionHistory,
}: EnhancedDocumentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const canEdit = permission === 'edit' || permission === 'admin';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({
        multicolor: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Underline,
    ],
    content: initialContent || '<p>Start writing your document...</p>',
    editable: canEdit,
    onUpdate: ({ editor }) => {
      // Auto-save after 2 seconds of inactivity
      if (canEdit) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          handleSave(editor.getHTML());
        }, 2000);
      }
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

  const handleSave = async (content?: string) => {
    const contentToSave = content || editor?.getHTML() || '';
    setIsSaving(true);
    try {
      await onSave(title, contentToSave);
      setLastSaved(new Date());
      toast.success('Document saved');
    } catch (error) {
      toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
  ];

  if (!editor) {
    return <div className="flex items-center justify-center h-96">Loading editor...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-1 flex-wrap">
            {/* Undo/Redo */}
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"
              title="Undo"
            >
              <UndoIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"
              title="Redo"
            >
              <RedoIcon className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Text Formatting */}
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
              title="Bold"
            >
              <BoldIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
              title="Italic"
            >
              <ItalicIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
              title="Underline"
            >
              <UnderlineIconLucide className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
              title="Strikethrough"
            >
              <StrikethroughIcon className="h-5 w-5" />
            </button>

            {/* Text Color */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded hover:bg-gray-100"
                title="Text Color"
              >
                <span className="flex items-center">
                  A
                  <div
                    className="w-4 h-1 ml-1"
                    style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                  />
                </span>
              </button>
              {showColorPicker && (
                <div className="absolute top-full mt-1 p-2 bg-white border rounded shadow-lg z-20">
                  <div className="grid grid-cols-5 gap-1">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          editor.chain().focus().setColor(color).run();
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlight */}
            <div className="relative">
              <button
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                className="p-2 rounded hover:bg-gray-100"
                title="Highlight"
              >
                <HighlighterIcon className="h-5 w-5" />
              </button>
              {showHighlightPicker && (
                <div className="absolute top-full mt-1 p-2 bg-white border rounded shadow-lg z-20">
                  <div className="grid grid-cols-5 gap-1">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          editor.chain().focus().toggleHighlight({ color }).run();
                          setShowHighlightPicker(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Headings */}
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
              title="Heading 1"
            >
              <Heading1Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
              title="Heading 2"
            >
              <Heading2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
              title="Heading 3"
            >
              <Heading3Icon className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Lists */}
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
              title="Bullet List"
            >
              <ListIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
              title="Numbered List"
            >
              <ListOrderedIcon className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Alignment */}
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
              title="Align Left"
            >
              <AlignLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
              title="Align Center"
            >
              <AlignCenterIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
              title="Align Right"
            >
              <AlignRightIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`}
              title="Justify"
            >
              <AlignJustifyIcon className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Insert Elements */}
            <button
              onClick={addLink}
              className="p-2 rounded hover:bg-gray-100"
              title="Insert Link"
            >
              <LinkIcon className="h-5 w-5" />
            </button>
            <button
              onClick={addImage}
              className="p-2 rounded hover:bg-gray-100"
              title="Insert Image"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <button
              onClick={addTable}
              className="p-2 rounded hover:bg-gray-100"
              title="Insert Table"
            >
              <TableIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
              title="Quote"
            >
              <QuoteIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
              title="Code Block"
            >
              <CodeIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <span className="text-sm text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {isSaving && <span className="text-sm text-gray-500">Saving...</span>}

            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
            >
              <SaveIcon className="h-4 w-4" />
              <span>Save</span>
            </button>

            {onComments && (
              <button
                onClick={onComments}
                className="p-2 rounded hover:bg-gray-100"
                title="Comments"
              >
                <MessageSquareIcon className="h-5 w-5" />
              </button>
            )}

            {onShare && (
              <button
                onClick={onShare}
                className="p-2 rounded hover:bg-gray-100"
                title="Share"
              >
                <Share2Icon className="h-5 w-5" />
              </button>
            )}

            {onVersionHistory && (
              <button
                onClick={onVersionHistory}
                className="p-2 rounded hover:bg-gray-100"
                title="Version History"
              >
                <ClockIcon className="h-5 w-5" />
              </button>
            )}

            {/* Export Menu */}
            {onExport && (
              <Menu as="div" className="relative">
                <Menu.Button className="p-2 rounded hover:bg-gray-100" title="Export">
                  <DownloadIcon className="h-5 w-5" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                    <div className="px-1 py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => onExport('pdf')}
                            className={`${
                              active ? 'bg-blue-500 text-white' : 'text-gray-900'
                            } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                          >
                            Export as PDF
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => onExport('markdown')}
                            className={`${
                              active ? 'bg-blue-500 text-white' : 'text-gray-900'
                            } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                          >
                            Export as Markdown
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => onExport('html')}
                            className={`${
                              active ? 'bg-blue-500 text-white' : 'text-gray-900'
                            } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                          >
                            Export as HTML
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="px-20 pt-8 pb-4 border-b border-gray-100">
        <textarea
          value={title}
          onChange={handleTitleChange}
          disabled={!canEdit}
          placeholder="Untitled Document"
          className="w-full text-4xl font-bold border-none outline-none resize-none overflow-hidden"
          rows={1}
        />
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-20 py-8">
          <EditorContent
            editor={editor}
            className="prose prose-lg max-w-none focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
