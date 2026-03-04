import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useBunkerList, useUpdateBottle, useUpdateBunkerItem, useRemoveBunkerItem } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useSpiritTypes } from '../hooks/useProducts';
import { useUIStore } from '../stores/uiStore';
import type { BunkerFilters, BunkerCardFields, BunkerListItem } from '../types/bunker';
import Dialog from '../components/ui/Dialog';
import BunkerActionRow from '../components/bunker/BunkerActionRow';
import BunkerSettingsDialog from '../components/bunker/BunkerSettingsDialog';
import BunkerTable from '../components/bunker/BunkerTable';
import BunkerEmptyState from '../components/bunker/BunkerEmptyState';

const FILTERS_KEY = 'pb_bunker_filters';
const IMAGES_KEY = 'pb_bunker_show_images';
const FIELDS_KEY = 'pb_bunker_card_fields';

const DEFAULT_CARD_FIELDS: BunkerCardFields = {
  show_details: true,
  show_company: true,
  show_type: true,
  show_abv: true,
  show_mash_bill: false,
  show_location: true,
  show_status: true,
  show_rating: true,
  show_description: false,
  show_notes: false,
};

function loadFilters(): BunkerFilters {
  try {
    const stored = localStorage.getItem(FILTERS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { sort_by: 'name', sort_dir: 'asc' };
}

function loadCardFields(): BunkerCardFields {
  try {
    const stored = localStorage.getItem(FIELDS_KEY);
    if (stored) return { ...DEFAULT_CARD_FIELDS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CARD_FIELDS;
}

export default function BunkerListPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [searchText, setSearchText] = useState('');
  const [showImages, setShowImages] = useState(() => localStorage.getItem(IMAGES_KEY) === '1');
  const [filters, setFilters] = useState<BunkerFilters>(loadFilters);
  const [cardFields, setCardFields] = useState<BunkerCardFields>(loadCardFields);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BunkerListItem | null>(null);

  const handleFilterChange = (partial: Partial<BunkerFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(FILTERS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleToggleImages = () => {
    setShowImages((prev) => {
      const next = !prev;
      if (next) localStorage.setItem(IMAGES_KEY, '1');
      else localStorage.removeItem(IMAGES_KEY);
      return next;
    });
  };

  const handleCardFieldToggle = (field: keyof BunkerCardFields) => {
    setCardFields((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      localStorage.setItem(FIELDS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const hasActiveFilters = !!(
    filters.spirit_type ||
    filters.location_id ||
    filters.statuses?.length ||
    showImages ||
    (filters.sort_by && filters.sort_by !== 'name') ||
    filters.sort_dir === 'desc'
  );

  const { data: items = [], isLoading } = useBunkerList(filters);
  const { data: locations = [] } = useLocations();
  const { data: spiritTypes = [] } = useSpiritTypes();
  const updateMutation = useUpdateBottle();
  const updateItemMutation = useUpdateBunkerItem();
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

  const handleRatingChange = (itemId: number, rating: number | null) => {
    updateItemMutation.mutate({ id: itemId, personal_rating: rating });
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

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['name', 'company_name', 'spirit_type'],
        threshold: 0.35,
        minMatchCharLength: 2,
        ignoreLocation: true,
      }),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    return fuse.search(searchText).map((r) => r.item);
  }, [fuse, items, searchText]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  return (
    <div>
      {/* Sticky header — heading + search/filter row stay visible while list scrolls */}
      <div className="sticky top-16 z-10 bg-gray-50 pt-4 sm:pt-6 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Your Bunker</h1>
          <span className="text-sm text-gray-500">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        {items.length > 0 && (
          <BunkerActionRow
            searchText={searchText}
            onSearchChange={setSearchText}
            onOpenSettings={() => setSettingsOpen(true)}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </div>

      {/* Scrollable content */}
      {items.length === 0 ? (
        <BunkerEmptyState />
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No bottles match your search.
        </div>
      ) : (
        <BunkerTable
          items={filteredItems}
          showImages={showImages}
          cardFields={cardFields}
          onStatusAction={handleStatusAction}
          onDelete={setDeleteTarget}
          onRatingChange={handleRatingChange}
        />
      )}

      <BunkerSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        showImages={showImages}
        onToggleImages={handleToggleImages}
        cardFields={cardFields}
        onCardFieldToggle={handleCardFieldToggle}
        locations={locations}
        spiritTypes={spiritTypes}
      />

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
