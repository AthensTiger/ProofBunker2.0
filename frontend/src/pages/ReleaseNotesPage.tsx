import { useEffect } from 'react';
import { useReleaseNotes, useMarkReleaseNotesRead } from '../hooks/useReleaseNotes';
import type { ReleaseNote } from '../types/releaseNotes';

const TYPE_CONFIG: Record<ReleaseNote['type'], { label: string; className: string }> = {
  new_feature: { label: 'New Feature', className: 'bg-amber-100 text-amber-800' },
  enhancement: { label: 'Enhancement', className: 'bg-blue-100 text-blue-800' },
  bug_fix:     { label: 'Bug Fix',     className: 'bg-green-100 text-green-700' },
  other:       { label: 'Other',       className: 'bg-gray-100 text-gray-600' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ReleaseNotesPage() {
  const { data, isLoading } = useReleaseNotes();
  const markRead = useMarkReleaseNotesRead();

  // Mark all as read when user visits this page
  useEffect(() => {
    markRead.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">What's New</h1>
        <p className="text-sm text-gray-500 mt-1">The latest improvements and fixes to Proof Bunker.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
        </div>
      ) : !data || data.notes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No release notes yet.</div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-amber-200 ml-[7px]" />

          <div className="space-y-8">
            {data.notes.map((note) => {
              const typeInfo = TYPE_CONFIG[note.type] || TYPE_CONFIG.other;
              return (
                <div key={note.id} className="flex gap-5">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 mt-1.5">
                    <div className="w-[15px] h-[15px] rounded-full bg-amber-600 border-2 border-white ring-2 ring-amber-200" />
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white rounded-lg shadow px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.className}`}>
                        {typeInfo.label}
                      </span>
                      {note.version && (
                        <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-gray-100 text-gray-500">
                          v{note.version}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{formatDate(note.created_at)}</span>
                    </div>
                    <h2 className="font-semibold text-gray-900 mb-1">{note.title}</h2>
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{note.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
