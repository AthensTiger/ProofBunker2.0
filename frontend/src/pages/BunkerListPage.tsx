import { useState, useMemo } from 'react';
import { useBunkerList, useUpdateBottle, useRemoveBunkerItem } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useSpiritTypes } from '../hooks/useProducts';
import { useUIStore } from '../stores/uiStore';
import type { BunkerFilters, BunkerListItem } from '../types/bunker';
import Dialog from '../components/ui/Dialog';
import BunkerActionRow from '../components/bunker/BunkerActionRow';
import BunkerTable from '../components/bunker/BunkerTable';
import BunkerEmptyState from '../components/bunker/BunkerEmptyState';

export default function BunkerListPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [searchText, setSearchText] = useState('');
  const [showImages, setShowImages] = useState(false);
  const [filters, setFilters] = useState<BunkerFilters>({
    sort_by: 'name',
    sort_dir: 'asc',
  });
  const [deleteTarget, setDeleteTarget] = useState<BunkerListItem | null>(null);

  const { data: items = [], isLoading } = useBunkerList(filters);
  const { data: locations = [] } = useLocations();
  const { data: spiritTypes = [] } = useSpiritTypes();
  const updateMutation = useUpdateBottle();
  const removeMutation = useRemoveBunkerItem();

  const handleStatusAction = (bottleId: number, newStatus: 'opened' | 'empty') => {
    updateMutation.mutate(
      { bottleId, status: newStatus },
      {
        onSuccess: () => addToast('success', newStatus === 'opened' ? 'Bottle marked as opened' : 'Bottle marked as empty'),
        onError: () => addToast('error', 'Failed to update status'),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('success', `"${deleteTarget.name}" removed from your bunker`);
        setDeleteTarget(null);
      },
      onError: () => addToast('error', 'Failed to remove item'),
    });
  };

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    const q = searchText.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.company_name && item.company_name.toLowerCase().includes(q)) ||
        item.spirit_type.toLowerCase().includes(q)
    );
  }, [items, searchText]);

  const handleFilterChange = (partial: Partial<BunkerFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Bunker</h1>
        <span className="text-sm text-gray-500">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {items.length === 0 ? (
        <BunkerEmptyState />
      ) : (
        <>
          <BunkerActionRow
            searchText={searchText}
            onSearchChange={setSearchText}
            filters={filters}
            onFilterChange={handleFilterChange}
            showImages={showImages}
            onToggleImages={() => setShowImages((v) => !v)}
            locations={locations}
            spiritTypes={spiritTypes}
          />

          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No bottles match your search.
            </div>
          ) : (
            <BunkerTable
              items={filteredItems}
              showImages={showImages}
              onStatusAction={handleStatusAction}
              onDelete={setDeleteTarget}
            />
          )}
        </>
      )}

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove from Bunker"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to remove <strong>{deleteTarget?.name}</strong> and all its bottles from your bunker?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={removeMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {removeMutation.isPending ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
