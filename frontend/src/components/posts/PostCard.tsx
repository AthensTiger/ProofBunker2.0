import { useState } from 'react';
import DOMPurify from 'dompurify';
import type { UserPost } from '../../types/posts';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

interface Props {
  post: UserPost;
}

export default function PostCard({ post }: Props) {
  const [expanded, setExpanded] = useState(false);

  const plainText = stripHtml(post.content);
  const isLong = plainText.length > 200;
  const excerpt = isLong ? plainText.slice(0, 200).trimEnd() + '…' : plainText;

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <button
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 leading-snug hover:text-amber-800 transition-colors">
              {post.title}
            </h3>
            {post.product_name && (
              <p className="text-xs text-amber-700 font-medium mt-0.5">{post.product_name}</p>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {!expanded && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{excerpt}</p>
        )}
      </button>

      {expanded && (
        <div className="mt-3">
          <PostContent content={post.content} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          {post.author_name && <span>{post.author_name}</span>}
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-amber-700 hover:text-amber-800 font-medium"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
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
