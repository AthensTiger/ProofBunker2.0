import { useState, useEffect } from 'react';
import type { BunkerBottle } from '../../types/bunker';
import type { StorageLocation } from '../../types/location';
import { useUpdateBottle } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import Dialog from '../ui/Dialog';
import HelpTip from '../ui/HelpTip';

interface BottleEditModalProps {
  bottle: BunkerBottle | null;
  locations: StorageLocation[];
  onClose: () => void;
  onDelete?: () => void;
}

export default function BottleEditModal({ bottle, locations, onClose, onDelete }: BottleEditModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const updateMutation = useUpdateBottle();

  const [locationId, setLocationId] = useState<number | undefined>();
  const [status, setStatus] = useState<string>('sealed');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (bottle) {
      let loc: number | undefined;
      if (bottle.storage_location_id != null) {
        loc = bottle.storage_location_id;
      } else if (locations.length > 0) {
        const saved = localStorage.getItem('pb_last_location_id');
        const savedId = saved ? Number(saved) : undefined;
        const savedExists = savedId != null && locations.some((l) => l.id === savedId);
        loc = savedExists ? savedId : locations[0].id;
      } else {
        const saved = localStorage.getItem('pb_last_location_id');
        loc = saved ? Number(saved) : undefined;
      }
      setLocationId(loc);
      setStatus(bottle.status);
      setPrice(bottle.purchase_price != null ? String(bottle.purchase_price) : '');
    }
  }, [bottle, locations]);

  const handleLocationChange = (val: number | undefined) => {
    setLocationId(val);
    if (val != null) localStorage.setItem('pb_last_location_id', String(val));
    else localStorage.removeItem('pb_last_location_id');
  };

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Location <HelpTip text="Where this physical bottle is stored (e.g., Bar Cart, Wine Cellar). Manage locations in Settings." /></label>
          <select
            value={locationId ?? ''}
            onChange={(e) => handleLocationChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {locations.length === 0 && <option value="">No location</option>}
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status <HelpTip text="Sealed = unopened bottle. Opened = bottle in use. Empty = finished — kept for recordkeeping." /></label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($) <HelpTip text="What you actually paid for this bottle. Private — only visible to you unless you share with prices enabled." /></label>
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

      <div className="flex items-center justify-between mt-6">
        {onDelete ? (
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete Bottle
          </button>
        ) : <div />}
        <div className="flex gap-3">
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
      </div>
    </Dialog>
  );
}
