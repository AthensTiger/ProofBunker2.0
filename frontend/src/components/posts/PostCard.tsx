import DOMPurify from 'dompurify';
import type { UserPost } from '../../types/posts';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

interface Props {
  post: UserPost;
}

export default function PostCard({ post }: Props) {
  const plainText = stripHtml(post.content);
  const excerpt = plainText.length > 200
    ? plainText.slice(0, 200).trimEnd() + '…'
    : plainText;

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{post.title}</h3>
          {post.product_name && (
            <p className="text-xs text-amber-700 font-medium mt-0.5">{post.product_name}</p>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{excerpt}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
        {post.author_name && <span>{post.author_name}</span>}
        <span>{new Date(post.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// Full post view with rendered rich text (used when expanding a post)
export function PostContent({ content }: { content: string }) {
  return (
    <div
      className="rich-text text-sm text-gray-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
    />
  );
}
