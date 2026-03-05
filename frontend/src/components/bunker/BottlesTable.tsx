import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { BunkerBottle } from '../../types/bunker';
import type { StorageLocation } from '../../types/location';
import { formatProof, formatAbv, formatAgeStatement } from '../../utils/format';
import { useDeleteBottle, useUpdateBottle } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import PhotoGallery from './PhotoGallery';
import PhotoUpload from './PhotoUpload';
import BottleEditModal from './BottleEditModal';
import Dialog from '../ui/Dialog';

interface ProductContext {
  proof: number | null;
  abv: number | null;
  age_statement: string | null;
  mash_bill: string | null;
  release_year: number | null;
}

interface BottlesTableProps {
  bottles: BunkerBottle[];
  locations: StorageLocation[];
  productId: number;
  productName?: string;
  productContext?: ProductContext | null;
}

const STATUS_ORDER: Record<string, number> = { sealed: 0, opened: 1, empty: 2 };

function formatBottleDetails(bottle: BunkerBottle): string {
  const parts: string[] = [];
  if (bottle.batch_number) parts.push(`Batch: ${bottle.batch_number}`);
  if (bottle.barrel_number) parts.push(`Barrel: ${bottle.barrel_number}`);
  if (bottle.year_distilled != null) parts.push(`Dist. ${bottle.year_distilled}`);
  if (bottle.override_proof != null) parts.push(`${formatProof(bottle.override_proof)}pf`);
  else if (bottle.override_abv != null) parts.push(`${formatAbv(bottle.override_abv)} ABV`);
  if (bottle.override_age_statement) parts.push(formatAgeStatement(bottle.override_age_statement));
  if (bottle.override_release_year != null) parts.push(`Rel. ${bottle.override_release_year}`);
  return parts.join(' · ');
}

export default function BottlesTable({ bottles, locations, productId, productName, productContext }: BottlesTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useUIStore((s) => s.addToast);
  const deleteMutation = useDeleteBottle();
  const updateMutation = useUpdateBottle();
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
    const isLastBottle = bottles.length === 1;
    deleteMutation.mutate(deleteBottle.id, {
      onSuccess: () => {
        setDeleteBottle(null);
        if (isLastBottle) {
          addToast('success', 'Item removed from bunker');
          navigate('/bunker');
        } else {
          addToast('success', 'Bottle deleted');
        }
      },
      onError: () => addToast('error', 'Failed to delete bottle'),
    });
  };

  const handleAddAnother = () => {
    navigate('/add-bottle', { state: { productId, productName, returnTo: location.pathname } });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Bottles ({bottles.length})
        </h2>
        <button
          onClick={handleAddAnother}
          className="text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          + Add Another Bottle
        </button>
      </div>

      <div className="space-y-4">
        {[...bottles].sort((a, b) => {
          const locA = a.location_name || '';
          const locB = b.location_name || '';
          if (locA !== locB) return locA.localeCompare(locB);
          return (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        }).map((bottle, idx) => {
          const detailSummary = formatBottleDetails(bottle);
          return (
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

              {detailSummary && (
                <p className="text-xs text-gray-400 mb-2">{detailSummary}</p>
              )}

              <div className="flex items-start gap-3">
                <PhotoGallery photos={bottle.photos} />
                <PhotoUpload bottleId={bottle.id} currentCount={bottle.photos.length} />
              </div>
            </div>
          );
        })}
      </div>

      <BottleEditModal
        bottle={editBottle}
        locations={locations}
        onClose={() => setEditBottle(null)}
        onDelete={editBottle ? () => { setDeleteBottle(editBottle); setEditBottle(null); } : undefined}
        productContext={productContext}
        productName={productName}
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
