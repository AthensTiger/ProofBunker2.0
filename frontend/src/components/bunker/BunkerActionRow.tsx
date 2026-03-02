import { Link } from 'react-router-dom';
import type { StorageLocation } from '../../types/location';
import type { SpiritTypeCount } from '../../types/product';
import type { BunkerFilters } from '../../types/bunker';

interface BunkerActionRowProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  filters: BunkerFilters;
  onFilterChange: (filters: Partial<BunkerFilters>) => void;
  showImages: boolean;
  onToggleImages: () => void;
  locations: StorageLocation[];
  spiritTypes: SpiritTypeCount[];
}

export default function BunkerActionRow({
  searchText,
  onSearchChange,
  filters,
  onFilterChange,
  showImages,
  onToggleImages,
  locations,
  spiritTypes,
}: BunkerActionRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Link
        to="/add-bottle"
        className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
      >
        Add Bottle
      </Link>
      <Link
        to="/batch-entry"
        className="border border-amber-700 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
      >
        Batch Scan
      </Link>

      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search bottles..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <select
        value={filters.spirit_type || ''}
        onChange={(e) => onFilterChange({ spirit_type: e.target.value || undefined })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="">All Types</option>
        {spiritTypes.map((st) => (
          <option key={st.spirit_type} value={st.spirit_type}>
            {st.spirit_type.charAt(0).toUpperCase() + st.spirit_type.slice(1)} ({st.count})
          </option>
        ))}
      </select>

      <select
        value={filters.location_id || ''}
        onChange={(e) => onFilterChange({ location_id: e.target.value ? Number(e.target.value) : undefined })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="">All Locations</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>

      <div className="relative">
        <button
          onClick={(e) => {
            const menu = (e.currentTarget.nextElementSibling as HTMLElement);
            menu.classList.toggle('hidden');
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 whitespace-nowrap"
        >
          Status{filters.statuses?.length ? ` (${filters.statuses.length})` : ': All'}
        </button>
        <div className="hidden absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-2 min-w-[140px]">
          {(['sealed', 'opened', 'empty'] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-50 rounded capitalize">
              <input
                type="checkbox"
                checked={filters.statuses?.includes(s) ?? false}
                onChange={() => {
                  const current = filters.statuses || [];
                  const next = current.includes(s)
                    ? current.filter((v) => v !== s)
                    : [...current, s];
                  onFilterChange({ statuses: next.length ? next : undefined });
                }}
                className="rounded border-gray-300 text-amber-700 focus:ring-amber-500"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <select
        value={filters.sort_by || 'name'}
        onChange={(e) => onFilterChange({ sort_by: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      >
        <option value="name">Name</option>
        <option value="spirit_type">Spirit Type</option>
        <option value="proof">Proof</option>
        <option value="rating">Rating</option>
        <option value="created_at">Date Added</option>
      </select>

      <button
        onClick={() => onFilterChange({ sort_dir: filters.sort_dir === 'desc' ? 'asc' : 'desc' })}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
        title={filters.sort_dir === 'desc' ? 'Descending' : 'Ascending'}
      >
        {filters.sort_dir === 'desc' ? '\u2193' : '\u2191'}
      </button>

      <button
        onClick={onToggleImages}
        className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
          showImages ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
        title="Toggle images"
      >
        IMG
      </button>
    </div>
  );
}
