import { useState, useMemo } from 'react';
import { useBunkerList } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useSpiritTypes } from '../hooks/useProducts';
import type { BunkerFilters } from '../types/bunker';
import BunkerActionRow from '../components/bunker/BunkerActionRow';
import BunkerTable from '../components/bunker/BunkerTable';
import BunkerEmptyState from '../components/bunker/BunkerEmptyState';

export default function BunkerListPage() {
  const [searchText, setSearchText] = useState('');
  const [showImages, setShowImages] = useState(false);
  const [filters, setFilters] = useState<BunkerFilters>({
    sort_by: 'name',
    sort_dir: 'asc',
  });

  const { data: items = [], isLoading } = useBunkerList(filters);
  const { data: locations = [] } = useLocations();
  const { data: spiritTypes = [] } = useSpiritTypes();

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
            />
          )}
        </>
      )}

    </div>
  );
}
