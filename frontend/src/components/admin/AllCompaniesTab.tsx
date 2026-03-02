import { useState } from 'react';
import { useAllCompanies, useDeleteCompany } from '../../hooks/useAdmin';
import { useUIStore } from '../../stores/uiStore';
import CompanyEditModal from './CompanyEditModal';

export default function AllCompaniesTab() {
  const addToast = useUIStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editId, setEditId] = useState<number | null>(null);
  const deleteMutation = useDeleteCompany();

  const { data, isLoading } = useAllCompanies({ q: search || undefined, limit: 50, offset: page * 50 });
  const companies = data?.companies || [];
  const total = data?.total || 0;

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? Products linked to this company will have their company set to null.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => addToast('success', `"${name}" deleted`),
      onError: () => addToast('error', 'Failed to delete company'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search companies..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500">{total} companies</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : companies.length === 0 ? (
        <p className="text-sm text-gray-500">No companies found.</p>
      ) : (
        <div className="space-y-2">
          {companies.map((c: any) => (
            <div key={c.id} className="bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-500">
                  {c.country && `${c.country} · `}
                  {c.product_count} product{c.product_count !== 1 ? 's' : ''}
                  {c.is_verified && ' · Verified'}
                </p>
              </div>
              {c.is_verified ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Verified</span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Unverified</span>
              )}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditId(c.id)}
                  className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
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

      {editId && <CompanyEditModal companyId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}
