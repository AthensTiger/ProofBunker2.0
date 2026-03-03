import { useState } from 'react';
import type { BunkerBottle } from '../../types/bunker';
import type { StorageLocation } from '../../types/location';
import { useDeleteBottle, useUpdateBottle, useAddToBunker } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import PhotoGallery from './PhotoGallery';
import PhotoUpload from './PhotoUpload';
import BottleEditModal from './BottleEditModal';
import Dialog from '../ui/Dialog';

interface BottlesTableProps {
  bottles: BunkerBottle[];
  locations: StorageLocation[];
  productId: number;
}

const STATUS_ORDER: Record<string, number> = { sealed: 0, opened: 1, empty: 2 };

export default function BottlesTable({ bottles, locations, productId }: BottlesTableProps) {
  const addToast = useUIStore((s) => s.addToast);
  const deleteMutation = useDeleteBottle();
  const updateMutation = useUpdateBottle();
  const addMutation = useAddToBunker();
  const [editBottle, setEditBottle] = useState<BunkerBottle | null>(null);
  const [deleteBottle, setDeleteBottle] = useState<BunkerBottle | null>(null);

  const handleQuickAction = (bottle: BunkerBottle) => {
    if (bottle.status === 'sealed') {
      updateMutation.mutate(
        { bottleId: bottle.id, status: 'opened' },
        {
          onSuccess: () => addToast('success', 'Bottle marked as opened'),
          onError: () => addToast('error', 'Failed to update status'),
        }
      );
    } else if (bottle.status === 'opened') {
      updateMutation.mutate(
        { bottleId: bottle.id, status: 'empty' },
        {
          onSuccess: () => addToast('success', 'Bottle marked as empty'),
          onError: () => addToast('error', 'Failed to update status'),
        }
      );
    } else {
      setDeleteBottle(bottle);
    }
  };

  const handleDeleteBottle = () => {
    if (!deleteBottle) return;
    deleteMutation.mutate(deleteBottle.id, {
      onSuccess: () => {
        addToast('success', 'Bottle deleted');
        setDeleteBottle(null);
      },
      onError: () => addToast('error', 'Failed to delete bottle'),
    });
  };

  const handleAddAnother = () => {
    addMutation.mutate(
      { product_id: productId },
      {
        onSuccess: () => addToast('success', 'Bottle added'),
        onError: () => addToast('error', 'Failed to add bottle'),
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Bottles ({bottles.length})
        </h2>
        <button
          onClick={handleAddAnother}
          disabled={addMutation.isPending}
          className="text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors disabled:opacity-50"
        >
          {addMutation.isPending ? 'Adding...' : '+ Add Another Bottle'}
        </button>
      </div>

      <div className="space-y-4">
        {[...bottles].sort((a, b) => {
          const locA = a.location_name || '';
          const locB = b.location_name || '';
          if (locA !== locB) return locA.localeCompare(locB);
          return (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        }).map((bottle, idx) => (
          <div
            key={bottle.id}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">#{idx + 1}</span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  bottle.status === 'sealed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {bottle.status}
                </span>
                {bottle.location_name && (
                  <span className="text-sm text-gray-600">{bottle.location_name}</span>
                )}
                {bottle.purchase_price != null && (
                  <span className="text-sm text-gray-600">${Number(bottle.purchase_price).toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditBottle(bottle)}
                  className="text-sm text-amber-700 hover:text-amber-800 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleQuickAction(bottle)}
                  disabled={updateMutation.isPending}
                  className={`text-sm font-medium disabled:opacity-50 ${
                    bottle.status === 'empty'
                      ? 'text-red-500 hover:text-red-700'
                      : 'text-amber-700 hover:text-amber-800'
                  }`}
                >
                  {bottle.status === 'sealed' ? 'Open' : bottle.status === 'opened' ? 'Empty' : 'Delete'}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <PhotoGallery photos={bottle.photos} />
              <PhotoUpload bottleId={bottle.id} currentCount={bottle.photos.length} />
            </div>
          </div>
        ))}
      </div>

      <BottleEditModal
        bottle={editBottle}
        locations={locations}
        onClose={() => setEditBottle(null)}
        onDelete={editBottle ? () => { setDeleteBottle(editBottle); setEditBottle(null); } : undefined}
      />

      <Dialog
        open={!!deleteBottle}
        onClose={() => setDeleteBottle(null)}
        title="Delete Bottle"
      >
        <p className="text-gray-600 mb-6">
          {bottles.length === 1
            ? 'This is the last bottle. Deleting it will remove the entire bunker item. Continue?'
            : 'Are you sure you want to delete this bottle?'}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteBottle(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteBottle}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
