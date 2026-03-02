import { useState } from 'react';
import { useAllDistillers, useDeleteDistiller } from '../../hooks/useAdmin';
import { useUIStore } from '../../stores/uiStore';
import DistillerEditModal from './DistillerEditModal';

export default function AllDistillersTab() {
  const addToast = useUIStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editId, setEditId] = useState<number | null>(null);
  const deleteMutation = useDeleteDistiller();

  const { data, isLoading } = useAllDistillers({ q: search || undefined, limit: 50, offset: page * 50 });
  const distillers = data?.distillers || [];
  const total = data?.total || 0;

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? Products linked to this distiller will have their distiller set to null.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => addToast('success', `"${name}" deleted`),
      onError: () => addToast('error', 'Failed to delete distiller'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search distillers..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500">{total} distillers</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : distillers.length === 0 ? (
        <p className="text-sm text-gray-500">No distillers found.</p>
      ) : (
        <div className="space-y-2">
          {distillers.map((d: any) => (
            <div key={d.id} className="bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{d.name}</p>
                <p className="text-xs text-gray-500">
                  {[d.region, d.country].filter(Boolean).join(', ')}
                  {d.product_count != null && ` · ${d.product_count} product${d.product_count !== 1 ? 's' : ''}`}
                </p>
              </div>
              {d.is_verified ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Verified</span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Unverified</span>
              )}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditId(d.id)}
                  className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(d.id, d.name)}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50">
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">Page {page + 1} of {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * 50 >= total} className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50">
            Next
          </button>
        </div>
      )}

      {editId && <DistillerEditModal distillerId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}
