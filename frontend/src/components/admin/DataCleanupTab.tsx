import { useState } from 'react';
import {
  useCorrections,
  useCleanupProgress,
  useApproveCorrection,
  useRejectCorrection,
  usePartialApproveCorrection,
  useBulkApproveCorrections,
} from '../../hooks/useAdmin';
import { formatProof } from '../../utils/format';

type StatusFilter = '' | 'pending' | 'approved' | 'rejected' | 'partial';

const CORRECTABLE_FIELDS = [
  { key: 'name', label: 'Product Name' },
  { key: 'company_name', label: 'Company' },
  { key: 'distiller_name', label: 'Distiller' },
  { key: 'proof', label: 'Proof' },
  { key: 'abv', label: 'ABV' },
  { key: 'age_statement', label: 'Age Statement' },
  { key: 'spirit_type', label: 'Spirit Type' },
  { key: 'spirit_subtype', label: 'Spirit Subtype' },
  { key: 'mash_bill', label: 'Mash Bill' },
  { key: 'barrel_type', label: 'Barrel Type' },
  { key: 'description', label: 'Description' },
  { key: 'msrp_usd', label: 'MSRP' },
];

export default function DataCleanupTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: progressData } = useCleanupProgress();
  const { data, isLoading } = useCorrections({
    status: statusFilter || undefined,
    sort_by: 'confidence',
    sort_dir: 'desc',
    limit,
    offset: page * limit,
  });
  const bulkApprove = useBulkApproveCorrections();

  const corrections = data?.corrections || [];
  const total = data?.total || 0;
  const stats = progressData?.stats;
  const progress = progressData?.progress;

  return (
    <div className="space-y-4">
      {/* Progress & Stats Bar */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Total Corrections" value={stats.total} />
            <Stat label="Pending" value={stats.pending} color="text-amber-700" />
            <Stat label="Approved" value={stats.approved} color="text-green-700" />
            <Stat label="Rejected" value={stats.rejected} color="text-red-600" />
            <Stat label="Partial" value={stats.partial} color="text-blue-600" />
            <Stat label="Avg Confidence" value={stats.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(0)}%` : 'N/A'} />
            {progress && (
              <Stat label="Script Status" value={`${progress.status} (${progress.products_done}/${progress.products_total})`} />
            )}
          </div>
        </div>
      )}

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="partial">Partial</option>
        </select>

        {statusFilter === 'pending' && stats?.pending > 0 && (
          <button
            onClick={() => {
              if (confirm(`Approve all corrections with 90%+ confidence?`)) {
                bulkApprove.mutate({ min_confidence: 0.9 });
              }
            }}
            disabled={bulkApprove.isPending}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
          >
            {bulkApprove.isPending ? 'Approving...' : 'Bulk Approve (90%+ confidence)'}
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto">
          {total} correction{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Corrections List */}
      {isLoading && <p className="text-gray-500 text-sm">Loading...</p>}
      {!isLoading && corrections.length === 0 && (
        <p className="text-gray-500 text-sm">No corrections found.</p>
      )}

      <div className="space-y-3">
        {corrections.map((c: any) => (
          <CorrectionCard key={c.id} correction={c} />
        ))}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}:</span>{' '}
      <span className={`font-semibold ${color || 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function CorrectionCard({ correction: c }: { correction: any }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const approve = useApproveCorrection();
  const reject = useRejectCorrection();
  const partialApprove = usePartialApproveCorrection();

  const isPending = c.status === 'pending' || c.status === 'partial';

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const changedFields = CORRECTABLE_FIELDS.filter((f) => {
    const proposed = c[`proposed_${f.key}`];
    const current = c[`current_${f.key}`];
    return proposed !== null && proposed !== undefined && proposed !== current;
  });

  const confidencePct = (c.confidence * 100).toFixed(0);
  const confidenceColor =
    c.confidence >= 0.8 ? 'text-green-700 bg-green-50' :
    c.confidence >= 0.5 ? 'text-amber-700 bg-amber-50' :
    'text-red-600 bg-red-50';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button onClick={() => setExpanded(!expanded)} className="text-left w-full">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{c.current_name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceColor}`}>
                {confidencePct}%
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                c.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                c.status === 'approved' ? 'bg-green-50 text-green-700' :
                c.status === 'rejected' ? 'bg-red-50 text-red-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {c.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} to update
            </p>
          </button>
        </div>

        {isPending && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => approve.mutate(c.id)}
              disabled={approve.isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
            >
              Approve All
            </button>
            <button
              onClick={() => reject.mutate(c.id)}
              disabled={reject.isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {/* AI Notes */}
          {c.ai_notes && (
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
              <span className="font-medium">AI Notes:</span> {c.ai_notes}
            </div>
          )}

          {/* Side-by-side comparison */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                {isPending && <th className="pb-1 pr-2 w-8"></th>}
                <th className="pb-1 pr-4">Field</th>
                <th className="pb-1 pr-4">Current</th>
                <th className="pb-1">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {changedFields.map((f) => {
                const current = c[`current_${f.key}`];
                const proposed = c[`proposed_${f.key}`];
                const displayCurrent = formatFieldValue(f.key, current);
                const displayProposed = formatFieldValue(f.key, proposed);

                return (
                  <tr key={f.key} className="border-b border-gray-50">
                    {isPending && (
                      <td className="py-1.5 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.has(f.key)}
                          onChange={() => toggleField(f.key)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                    )}
                    <td className="py-1.5 pr-4 text-gray-500 font-medium whitespace-nowrap">{f.label}</td>
                    <td className="py-1.5 pr-4 text-red-600 line-through">{displayCurrent || <span className="text-gray-300 no-underline">—</span>}</td>
                    <td className="py-1.5 text-green-700 font-medium">{displayProposed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Partial approve */}
          {isPending && selectedFields.size > 0 && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => partialApprove.mutate({ id: c.id, fields: Array.from(selectedFields) })}
                disabled={partialApprove.isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                Apply {selectedFields.size} Selected Field{selectedFields.size !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Sources */}
          {c.sources && c.sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Sources:</p>
              <div className="flex flex-wrap gap-1">
                {c.sources.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-700 hover:text-amber-800 underline truncate max-w-xs"
                  >
                    {new URL(url).hostname}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (key === 'proof') return formatProof(Number(value));
  if (key === 'abv') return `${(Number(value) * 100).toFixed(1)}%`;
  if (key === 'msrp_usd') return `$${Number(value).toFixed(2)}`;
  return String(value);
}
