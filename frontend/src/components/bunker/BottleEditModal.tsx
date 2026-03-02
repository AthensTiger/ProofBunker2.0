import { useState, useEffect } from 'react';
import type { BunkerBottle } from '../../types/bunker';
import type { StorageLocation } from '../../types/location';
import { useUpdateBottle } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import Dialog from '../ui/Dialog';

interface BottleEditModalProps {
  bottle: BunkerBottle | null;
  locations: StorageLocation[];
  onClose: () => void;
}

export default function BottleEditModal({ bottle, locations, onClose }: BottleEditModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const updateMutation = useUpdateBottle();

  const [locationId, setLocationId] = useState<number | undefined>();
  const [status, setStatus] = useState<string>('sealed');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (bottle) {
      setLocationId(bottle.storage_location_id ?? undefined);
      setStatus(bottle.status);
      setPrice(bottle.purchase_price != null ? String(bottle.purchase_price) : '');
    }
  }, [bottle]);

  if (!bottle) return null;

  const handleSave = () => {
    updateMutation.mutate(
      {
        bottleId: bottle.id,
        storage_location_id: locationId,
        status,
        purchase_price: price ? parseFloat(price) : undefined,
      },
      {
        onSuccess: () => {
          addToast('success', 'Bottle updated');
          onClose();
        },
        onError: () => addToast('error', 'Failed to update bottle'),
      }
    );
  };

  return (
    <Dialog open={!!bottle} onClose={onClose} title="Edit Bottle">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            value={locationId ?? ''}
            onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">No location</option>
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
                status === 'sealed'
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sealed
            </button>
            <button
              type="button"
              onClick={() => setStatus('opened')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                status === 'opened'
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Opened
            </button>
            <button
              type="button"
              onClick={() => setStatus('empty')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                status === 'empty'
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}
