import { useState } from 'react';
import { useAllProducts, useDeleteProduct } from '../../hooks/useAdmin';
import { useUIStore } from '../../stores/uiStore';
import ProductEditModal from './ProductEditModal';
import type { AdminProductFilters } from '../../types/product';
import { formatProof } from '../../utils/format';

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AllProductsTab() {
  const addToast = useUIStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [editId, setEditId] = useState<number | null>(null);
  const deleteMutation = useDeleteProduct();

  const filters: AdminProductFilters = {
    q: search || undefined,
    approval_status: statusFilter || undefined,
    limit: 50,
    offset: page * 50,
  };

  const { data, isLoading } = useAllProducts(filters);
  const products = data?.products || [];
  const total = data?.total || 0;

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove it from all user bunkers.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => addToast('success', `"${name}" deleted`),
      onError: () => addToast('error', 'Failed to delete product'),
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search products..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-sm text-gray-500">{total} products</span>
      </div>

      {/* Product list */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500">No products found.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p: any) => (
            <div key={p.id} className="bg-white rounded-lg shadow px-4 py-3 flex items-center gap-4">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover object-right flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.company_name && `${p.company_name} · `}
                  <span className="capitalize">{p.spirit_subtype || p.spirit_type}</span>
                  {p.proof != null && ` · ${formatProof(p.proof)}pf`}
                </p>
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[p.approval_status] || 'bg-gray-100 text-gray-600'}`}>
                {p.approval_status}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditId(p.id)}
                  className="px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
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

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            Page {page + 1} of {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * 50 >= total}
            className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editId && <ProductEditModal productId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}
