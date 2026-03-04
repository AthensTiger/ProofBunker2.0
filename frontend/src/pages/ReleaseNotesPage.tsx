import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useMarkReleaseNotesRead } from '../hooks/useReleaseNotes';

export default function ReleaseNotesPage() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const markRead = useMarkReleaseNotesRead();

  useEffect(() => {
    markRead.mutate();
    fetch('/release-notes-latest.md')
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then(setMarkdown)
      .catch(() => setError(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">What's New</h1>
        <p className="text-sm text-gray-500 mt-1">The latest improvements and fixes to Proof Bunker.</p>
      </div>

      {error ? (
        <div className="text-center py-20 text-gray-400">Release notes not available.</div>
      ) : markdown === null ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow px-8 py-7 prose prose-sm max-w-none
          prose-headings:text-gray-900 prose-headings:font-bold
          prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3 prose-h1:mb-5
          prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-amber-800
          prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
          prose-p:text-gray-700 prose-p:leading-relaxed
          prose-li:text-gray-700 prose-li:leading-relaxed
          prose-strong:text-gray-900
          prose-table:text-sm prose-table:border-collapse
          prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:border prose-th:border-gray-200
          prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-200
          prose-hr:border-gray-200 prose-hr:my-6
          prose-code:text-amber-700 prose-code:bg-amber-50 prose-code:px-1 prose-code:rounded">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
