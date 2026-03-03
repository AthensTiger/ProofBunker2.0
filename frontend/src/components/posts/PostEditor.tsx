import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { UserPost } from '../../types/posts';

interface Props {
  initial?: UserPost;
  title: string;
  onTitleChange: (t: string) => void;
  onSave: (data: { title: string; content: string; product_id?: number | null }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 text-sm rounded transition-colors ${
        active
          ? 'bg-amber-700 text-white'
          : 'text-gray-600 hover:bg-gray-100 disabled:opacity-40'
      }`}
    >
      {children}
    </button>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────

export default function PostEditor({ initial, title, onTitleChange, onSave, onCancel, isSaving }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initial?.content ?? '',
    editorProps: {
      attributes: {
        class: 'tiptap rich-text outline-none min-h-[200px] px-3 py-2 text-sm text-gray-900',
      },
    },
  });

  const canSubmit = title.trim().length > 0 && editor && !editor.isEmpty;

  const handleSave = () => {
    if (!editor) return;
    onSave({ title, content: editor.getHTML(), product_id: initial?.product_id ?? null });
  };

  if (!editor) return null;

  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Post title…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Rich text editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border border-gray-300 rounded-t-lg bg-gray-50 border-b-0">
          <ToolbarButton
            title="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>

          <span className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarButton
            title="Heading 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            title="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>

          <span className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarButton
            title="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Ordered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h11M9 12h11M9 19h11M5 5v.01M5 12v.01M5 19v.01" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Blockquote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 11H6.101l.001-.009A4.006 4.006 0 016 11a4 4 0 016 3.465V15a3 3 0 11-2-2.829zm8 0h-3.899l.001-.009A4.006 4.006 0 0114 11a4 4 0 016 3.465V15a3 3 0 11-2-2.829z"/>
            </svg>
          </ToolbarButton>

          <span className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarButton
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 010 16H3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l4-4m-4 4l4 4" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 000 16h10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10l-4-4m4 4l-4 4" />
            </svg>
          </ToolbarButton>
        </div>

        {/* Editable area */}
        <div className="border border-gray-300 rounded-b-lg focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Revert notice for submitted/published posts */}
      {initial && initial.status !== 'draft' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Saving changes will move this post back to <strong>Draft</strong>. You can resubmit for review when ready.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!canSubmit || isSaving}
          className="px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving…' : initial && initial.status !== 'draft' ? 'Save Revision' : 'Save Draft'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
