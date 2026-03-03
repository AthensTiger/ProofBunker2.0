import { useState } from 'react';
import type { StorageLocation } from '../../types/location';

interface OverrideFields {
  batch_number: string;
  barrel_number: string;
  year_distilled: string;
  release_year: string;
  proof: string;
  abv: string;
  age_statement: string;
  mash_bill: string;
}

const EMPTY_OVERRIDES: OverrideFields = {
  batch_number: '', barrel_number: '', year_distilled: '', release_year: '',
  proof: '', abv: '', age_statement: '', mash_bill: '',
};

interface BottleDetailsFormProps {
  locations: StorageLocation[];
  onSubmit: (details: {
    storage_location_id?: number;
    status: string;
    purchase_price?: number;
    batch_number?: string | null;
    barrel_number?: string | null;
    year_distilled?: number | null;
    release_year?: number | null;
    proof?: number | null;
    abv?: number | null;
    age_statement?: string | null;
    mash_bill?: string | null;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
  productName: string;
}

export default function BottleDetailsForm({ locations, onSubmit, onCancel, isPending, productName }: BottleDetailsFormProps) {
  const [locationId, setLocationId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('pb_last_location_id');
    const savedId = saved ? Number(saved) : undefined;
    const savedExists = savedId != null && locations.some((l) => l.id === savedId);
    if (savedExists) return savedId;
    if (locations.length > 0) return locations[0].id;
    return undefined;
  });
  const [status, setStatus] = useState('sealed');
  const [price, setPrice] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [overrides, setOverrides] = useState<OverrideFields>(EMPTY_OVERRIDES);

  const setField = (key: keyof OverrideFields, value: string) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toNum = (v: string) => v.trim() ? parseFloat(v) : null;
    const toInt = (v: string) => v.trim() ? parseInt(v, 10) : null;
    const toStr = (v: string) => v.trim() || null;
    onSubmit({
      storage_location_id: locationId,
      status,
      purchase_price: price ? parseFloat(price) : undefined,
      batch_number:   toStr(overrides.batch_number),
      barrel_number:  toStr(overrides.barrel_number),
      year_distilled: toInt(overrides.year_distilled),
      release_year:   toInt(overrides.release_year),
      proof:          toNum(overrides.proof),
      // ABV entered as percentage (45.5), stored as fraction (0.455)
      abv:            overrides.abv.trim() ? parseFloat((parseFloat(overrides.abv) / 100).toFixed(6)) : null,
      age_statement:  toStr(overrides.age_statement),
      mash_bill:      toStr(overrides.mash_bill),
    });
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Add <span className="text-amber-700">{productName}</span> to Bunker
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            value={locationId ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              setLocationId(val);
              if (val != null) localStorage.setItem('pb_last_location_id', String(val));
              else localStorage.removeItem('pb_last_location_id');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {locations.length === 0 && <option value="">No location</option>}
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <div className="flex gap-2">
            {(['sealed', 'opened', 'empty'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                  status === s ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        {/* Optional bottle-specific details */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Bottle-Specific Details (optional)
          </button>

          {showDetails && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Batch #</label>
                <input type="text" value={overrides.batch_number} onChange={(e) => setField('batch_number', e.target.value)} placeholder="e.g., Batch 7" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Barrel #</label>
                <input type="text" value={overrides.barrel_number} onChange={(e) => setField('barrel_number', e.target.value)} placeholder="e.g., 12B" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year Distilled</label>
                <input type="number" min="1800" max="2099" value={overrides.year_distilled} onChange={(e) => setField('year_distilled', e.target.value)} placeholder="e.g., 2019" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Release Year</label>
                <input type="number" min="1800" max="2099" value={overrides.release_year} onChange={(e) => setField('release_year', e.target.value)} placeholder="e.g., 2022" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proof</label>
                <input type="number" step="0.1" min="0" value={overrides.proof} onChange={(e) => setField('proof', e.target.value)} placeholder="e.g., 90.0" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ABV (%)</label>
                <input type="number" step="0.1" min="0" max="100" value={overrides.abv} onChange={(e) => setField('abv', e.target.value)} placeholder="e.g., 45.0" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Age Statement</label>
                <input type="text" value={overrides.age_statement} onChange={(e) => setField('age_statement', e.target.value)} placeholder="e.g., 12 Year" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mash Bill</label>
                <input type="text" value={overrides.mash_bill} onChange={(e) => setField('mash_bill', e.target.value)} placeholder="e.g., 75% corn, 21% rye" className={inputClass} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? 'Adding...' : 'Add to Bunker'}
        </button>
      </div>
    </form>
  );
}
