import { useState } from 'react';
import type { UserPost } from '../../types/posts';

interface Props {
  initial?: UserPost;
  onSave: (data: { title: string; content: string; product_id?: number | null }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function PostEditor({ initial, onSave, onCancel, isSaving }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post…"
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave({ title, content, product_id: initial?.product_id ?? null })}
          disabled={!canSubmit || isSaving}
          className="px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Draft'}
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
