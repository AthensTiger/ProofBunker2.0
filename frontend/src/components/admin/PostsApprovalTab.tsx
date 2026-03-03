import { useState } from 'react';
import DOMPurify from 'dompurify';
import { usePendingPosts, useApprovePost, useRejectPost } from '../../hooks/usePosts';
import type { UserPost } from '../../types/posts';

export default function PostsApprovalTab() {
  const { data: posts = [], isLoading } = usePendingPosts();
  const approve = useApprovePost();
  const reject = useRejectPost();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notesMap, setNotesMap] = useState<Record<number, string>>({});

  if (isLoading) return <p className="text-gray-500 text-sm">Loading…</p>;
  if (posts.length === 0) return <p className="text-gray-500 text-sm">No posts pending review.</p>;

  const setNotes = (id: number, notes: string) =>
    setNotesMap((prev) => ({ ...prev, [id]: notes }));

  const handleApprove = (post: UserPost) => {
    approve.mutate({ id: post.id, notes: notesMap[post.id] });
  };

  const handleReject = (post: UserPost) => {
    const notes = notesMap[post.id]?.trim();
    if (!notes) {
      alert('Please add a rejection reason before rejecting.');
      return;
    }
    reject.mutate({ id: post.id, notes });
  };

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button
                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                className="text-left"
              >
                <h3 className="font-semibold text-gray-900">{post.title}</h3>
                <p className="text-sm text-gray-500">
                  By {post.author_name}
                  {post.product_name ? ` · ${post.product_name}` : ''}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </button>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md"
              >
                {expandedId === post.id ? 'Collapse' : 'Read'}
              </button>
            </div>
          </div>

          {expandedId === post.id && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              <div
                className="rich-text text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
              />

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Notes (required for rejection, optional for approval)
                </label>
                <textarea
                  value={notesMap[post.id] ?? ''}
                  onChange={(e) => setNotes(post.id, e.target.value)}
                  rows={2}
                  placeholder="Feedback for the author…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(post)}
                  disabled={approve.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(post)}
                  disabled={reject.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
