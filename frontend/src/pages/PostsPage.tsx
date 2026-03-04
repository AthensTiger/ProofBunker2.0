import { useState } from 'react';
import {
  usePublicPosts,
  useMyPosts,
  useCreatePost,
  useUpdatePost,
  useSubmitPost,
  useDeletePost,
} from '../hooks/usePosts';
import PostCard from '../components/posts/PostCard';
import PostEditor from '../components/posts/PostEditor';
import { useUIStore } from '../stores/uiStore';
import type { UserPost } from '../types/posts';

type Tab = 'community' | 'mine';

const STATUS_LABELS: Record<UserPost['status'], string> = {
  draft: 'Draft',
  pending_approval: 'Pending Review',
  published: 'Published',
  public: 'Public',
};

const STATUS_COLORS: Record<UserPost['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-700',
  public: 'bg-blue-100 text-blue-700',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export default function PostsPage() {
  const [tab, setTab] = useState<Tab>('community');
  const [showEditor, setShowEditor] = useState(false);
  const [editPost, setEditPost] = useState<UserPost | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const { data: publicPosts = [], isLoading: loadingPublic } = usePublicPosts();
  const { data: myPosts = [], isLoading: loadingMine } = useMyPosts();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const submitPost = useSubmitPost();
  const deletePost = useDeletePost();

  const draftCount = myPosts.filter((p) => p.status === 'draft').length;

  const openNew = () => {
    setEditPost(null);
    setEditorTitle('');
    setShowEditor(true);
  };

  const openEdit = (post: UserPost) => {
    setEditPost(post);
    setEditorTitle(post.title);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditPost(null);
    setEditorTitle('');
  };

  const handleSave = (data: { title: string; content: string; product_id?: number | null }) => {
    if (editPost) {
      const wasSubmitted = editPost.status !== 'draft';
      updatePost.mutate(
        { id: editPost.id, ...data },
        {
          onSuccess: () => {
            closeEditor();
            addToast('success', wasSubmitted ? 'Post revised — resubmit when ready' : 'Draft updated');
          },
          onError: () => addToast('error', 'Failed to save changes'),
        }
      );
    } else {
      createPost.mutate(data, {
        onSuccess: () => {
          closeEditor();
          setTab('mine');
          addToast('success', 'Draft saved — find it in My Posts');
        },
        onError: () => addToast('error', 'Failed to save draft'),
      });
    }
  };

  const handleSubmit = (post: UserPost) => {
    submitPost.mutate(post.id, {
      onSuccess: () => addToast('success', 'Post submitted for review'),
      onError: () => addToast('error', 'Failed to submit post'),
    });
  };

  const handleDelete = (post: UserPost) => {
    if (!confirm(`Delete "${post.title}"?`)) return;
    deletePost.mutate(post.id, {
      onSuccess: () => addToast('success', 'Post deleted'),
      onError: () => addToast('error', 'Failed to delete post'),
    });
  };

  return (
    <div>
      {/* Sticky header — title + tabs stay visible while content scrolls */}
      <div className="sticky top-16 z-10 bg-gray-50 pt-4 sm:pt-6 pb-0 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Community Posts</h1>
          {tab === 'mine' && !showEditor && (
            <button
              onClick={openNew}
              className="px-3 py-1.5 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors"
            >
              New Post
            </button>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex gap-6">
          {(['community', 'mine'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); closeEditor(); }}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-amber-700 text-amber-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'community' ? 'Community' : (
                <span className="flex items-center gap-1.5">
                  My Posts
                  {draftCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-medium rounded-full bg-amber-700 text-white">
                      {draftCount}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-4 pt-4">

      {/* Community feed */}
      {tab === 'community' && (
        loadingPublic ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
          </div>
        ) : publicPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No posts published yet. Be the first to share!
          </div>
        ) : (
          <div className="space-y-4">
            {publicPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )
      )}

      {/* My posts */}
      {tab === 'mine' && (
        <div className="space-y-4">
          {showEditor && (
            <PostEditor
              initial={editPost ?? undefined}
              title={editorTitle}
              onTitleChange={setEditorTitle}
              onSave={handleSave}
              onCancel={closeEditor}
              isSaving={createPost.isPending || updatePost.isPending}
            />
          )}

          {loadingMine ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
            </div>
          ) : myPosts.length === 0 && !showEditor ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              You have no posts yet. Click "New Post" to get started.
            </div>
          ) : (
            myPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">{post.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[post.status]}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                    </div>
                    {post.product_name && (
                      <p className="text-xs text-amber-700 font-medium mt-0.5">{post.product_name}</p>
                    )}
                    {post.last_decision === 'rejected' && post.last_notes && (
                      <p className="text-xs text-red-600 mt-1">Rejected: {post.last_notes}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {stripHtml(post.content)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {(post.status === 'draft' || post.status === 'pending_approval' || post.status === 'published') && (
                      <button
                        onClick={() => openEdit(post)}
                        className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md border border-amber-200 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {post.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleSubmit(post)}
                          disabled={submitPost.isPending}
                          className="px-3 py-1 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-md disabled:opacity-50 transition-colors"
                        >
                          Submit for Review
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          disabled={deletePost.isPending}
                          className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {post.status === 'pending_approval' && (
                      <span className="text-xs text-gray-400 italic">Awaiting review…</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      </div>
    </div>
  );
}
