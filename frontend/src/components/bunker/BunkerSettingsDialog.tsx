import type { StorageLocation } from '../../types/location';
import type { SpiritTypeCount } from '../../types/product';
import type { BunkerFilters, BunkerCardFields } from '../../types/bunker';
import Dialog from '../ui/Dialog';

interface BunkerSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  filters: BunkerFilters;
  onFilterChange: (partial: Partial<BunkerFilters>) => void;
  showImages: boolean;
  onToggleImages: () => void;
  cardFields: BunkerCardFields;
  onCardFieldToggle: (field: keyof BunkerCardFields) => void;
  locations: StorageLocation[];
  spiritTypes: SpiritTypeCount[];
}

const FIELD_GROUPS: { label: string; fields: { key: keyof BunkerCardFields; label: string }[] }[] = [
  {
    label: 'Summary',
    fields: [
      { key: 'show_details',     label: 'Details (batch · barrel · proof · age · release year)' },
      { key: 'show_mash_bill',   label: 'Mash Bill' },
      { key: 'show_description', label: 'Description' },
      { key: 'show_notes',       label: 'Personal Notes' },
    ],
  },
  {
    label: 'Info',
    fields: [
      { key: 'show_company',  label: 'Company' },
      { key: 'show_type',     label: 'Spirit Type' },
      { key: 'show_abv',      label: 'ABV' },
      { key: 'show_location', label: 'Location' },
      { key: 'show_status',   label: 'Status' },
      { key: 'show_rating',   label: 'Rating' },
    ],
  },
];

export default function BunkerSettingsDialog({
  open,
  onClose,
  filters,
  onFilterChange,
  showImages,
  onToggleImages,
  cardFields,
  onCardFieldToggle,
  locations,
  spiritTypes,
}: BunkerSettingsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="List Settings">
      <div className="space-y-6">

        {/* ── Filters ── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Filters</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spirit Type</label>
              <select
                value={filters.spirit_type || ''}
                onChange={(e) => onFilterChange({ spirit_type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Types</option>
                {spiritTypes.map((st) => (
                  <option key={st.spirit_type} value={st.spirit_type}>
                    {st.spirit_type.charAt(0).toUpperCase() + st.spirit_type.slice(1)} ({st.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={filters.location_id || ''}
                onChange={(e) => onFilterChange({ location_id: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex gap-4">
                {(['sealed', 'opened', 'empty'] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer capitalize">
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
          </div>
        </section>

        {/* ── Sort ── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sort</p>
          <div className="flex gap-2">
            <select
              value={filters.sort_by || 'name'}
              onChange={(e) => onFilterChange({ sort_by: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="name">Name</option>
              <option value="spirit_type">Spirit Type</option>
              <option value="proof">Proof</option>
              <option value="rating">Rating</option>
              <option value="created_at">Date Added</option>
            </select>
            <button
              onClick={() => onFilterChange({ sort_dir: filters.sort_dir === 'desc' ? 'asc' : 'desc' })}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 font-medium"
              title={filters.sort_dir === 'desc' ? 'Descending' : 'Ascending'}
            >
              {filters.sort_dir === 'desc' ? '↓ Desc' : '↑ Asc'}
            </button>
          </div>
        </section>

        {/* ── Display ── */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Display</p>

          {/* Images toggle */}
          <label className="flex items-center gap-3 py-1.5 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={showImages}
              onChange={onToggleImages}
              className="rounded border-gray-300 text-amber-700 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">Show Images</span>
          </label>

          {/* Field groups */}
          {FIELD_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">{group.label}</p>
              <div className="space-y-1">
                {group.fields.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 py-1 cursor-pointer rounded hover:bg-gray-50 px-1">
                    <input
                      type="checkbox"
                      checked={cardFields[key]}
                      onChange={() => onCardFieldToggle(key)}
                      className="rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </Dialog>
  );
}
