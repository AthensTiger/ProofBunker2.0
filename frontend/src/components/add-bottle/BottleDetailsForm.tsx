import { useState } from 'react';
import type { StorageLocation } from '../../types/location';

interface BottleDetailsFormProps {
  locations: StorageLocation[];
  onSubmit: (details: { storage_location_id?: number; status: string; purchase_price?: number }) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      storage_location_id: locationId,
      status,
      purchase_price: price ? parseFloat(price) : undefined,
    });
  };

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
            <button
              type="button"
              onClick={() => setStatus('sealed')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                status === 'sealed' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sealed
            </button>
            <button
              type="button"
              onClick={() => setStatus('opened')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                status === 'opened' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Opened
            </button>
            <button
              type="button"
              onClick={() => setStatus('empty')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                status === 'empty' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Empty
            </button>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
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
