import { useState, useEffect } from 'react';
import type { BunkerBottle } from '../../types/bunker';
import type { StorageLocation } from '../../types/location';
import { useUpdateBottle } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import Dialog from '../ui/Dialog';
import HelpTip from '../ui/HelpTip';

interface ProductContext {
  proof: number | null;
  abv: number | null;
  age_statement: string | null;
  mash_bill: string | null;
  release_year: number | null;
}

interface BottleEditModalProps {
  bottle: BunkerBottle | null;
  locations: StorageLocation[];
  onClose: () => void;
  onDelete?: () => void;
  productContext?: ProductContext | null;
}

function fmtAbv(fraction: number | null | undefined): string {
  if (fraction == null) return '';
  return parseFloat((Number(fraction) * 100).toFixed(2)).toString();
}

export default function BottleEditModal({ bottle, locations, onClose, onDelete, productContext }: BottleEditModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const updateMutation = useUpdateBottle();

  const [locationId, setLocationId] = useState<number | undefined>();
  const [status, setStatus] = useState<string>('sealed');
  const [price, setPrice] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const [batchNumber, setBatchNumber] = useState('');
  const [barrelNumber, setBarrelNumber] = useState('');
  const [yearDistilled, setYearDistilled] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [proof, setProof] = useState('');
  const [abv, setAbv] = useState('');
  const [ageStatement, setAgeStatement] = useState('');
  const [mashBill, setMashBill] = useState('');

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

      setBatchNumber(bottle.batch_number ?? '');
      setBarrelNumber(bottle.barrel_number ?? '');
      setYearDistilled(bottle.year_distilled != null ? String(bottle.year_distilled) : '');
      setReleaseYear(bottle.override_release_year != null ? String(bottle.override_release_year) : '');
      setProof(bottle.override_proof != null ? String(bottle.override_proof) : '');
      setAbv(bottle.override_abv != null ? fmtAbv(bottle.override_abv) : '');
      setAgeStatement(bottle.override_age_statement ?? '');
      setMashBill(bottle.override_mash_bill ?? '');

      const hasDetails = !!(bottle.batch_number || bottle.barrel_number ||
        bottle.year_distilled != null || bottle.override_release_year != null ||
        bottle.override_proof != null || bottle.override_abv != null ||
        bottle.override_age_statement || bottle.override_mash_bill);
      setShowDetails(hasDetails);
    }
  }, [bottle, locations]);

  const handleLocationChange = (val: number | undefined) => {
    setLocationId(val);
    if (val != null) localStorage.setItem('pb_last_location_id', String(val));
    else localStorage.removeItem('pb_last_location_id');
  };

  if (!bottle) return null;

  const toNum = (v: string) => v.trim() ? parseFloat(v) : null;
  const toInt = (v: string) => v.trim() ? parseInt(v, 10) : null;
  const toStr = (v: string) => v.trim() || null;

  const handleSave = () => {
    updateMutation.mutate(
      {
        bottleId: bottle.id,
        storage_location_id: locationId ?? null,
        status,
        purchase_price: price ? parseFloat(price) : null,
        batch_number:   toStr(batchNumber),
        barrel_number:  toStr(barrelNumber),
        year_distilled: toInt(yearDistilled),
        release_year:   toInt(releaseYear),
        proof:          toNum(proof),
        abv:            abv.trim() ? parseFloat((parseFloat(abv) / 100).toFixed(6)) : null,
        age_statement:  toStr(ageStatement),
        mash_bill:      toStr(mashBill),
      },
      {
        onSuccess: () => { addToast('success', 'Bottle updated'); onClose(); },
        onError: () => addToast('error', 'Failed to update bottle'),
      }
    );
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

  const fromProductLabel = (fieldVal: string, productVal: string | number | null | undefined) =>
    !fieldVal.trim() && productVal != null
      ? <span className="ml-1 text-[10px] text-amber-600 font-normal">from product</span>
      : null;

  return (
    <Dialog open={!!bottle} onClose={onClose} title="Edit Bottle">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <HelpTip text="Where this physical bottle is stored." />
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status <HelpTip text="Sealed = unopened. Opened = in use. Empty = finished." />
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Price ($) <HelpTip text="What you paid for this bottle." />
          </label>
          <input
            type="number" step="0.01" min="0"
            value={price} onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00" className={inputClass}
          />
        </div>

        {/* Bottle-specific details */}
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
                <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g., Batch 7" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Barrel #</label>
                <input type="text" value={barrelNumber} onChange={(e) => setBarrelNumber(e.target.value)} placeholder="e.g., 12B" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year Distilled</label>
                <input type="number" min="1800" max="2099" value={yearDistilled} onChange={(e) => setYearDistilled(e.target.value)} placeholder="e.g., 2019" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Release Year{fromProductLabel(releaseYear, productContext?.release_year)}
                </label>
                <input type="number" min="1800" max="2099" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="e.g., 2022" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Proof{fromProductLabel(proof, productContext?.proof)}
                </label>
                <input type="number" step="0.1" min="0" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="e.g., 90.0" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ABV (%){fromProductLabel(abv, productContext?.abv)}
                </label>
                <input type="number" step="0.1" min="0" max="100" value={abv} onChange={(e) => setAbv(e.target.value)} placeholder="e.g., 45.0" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Age Statement{fromProductLabel(ageStatement, productContext?.age_statement)}
                </label>
                <input type="text" value={ageStatement} onChange={(e) => setAgeStatement(e.target.value)} placeholder="e.g., 12 Year" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Mash Bill{fromProductLabel(mashBill, productContext?.mash_bill)}
                </label>
                <input type="text" value={mashBill} onChange={(e) => setMashBill(e.target.value)} placeholder="e.g., 75% corn, 21% rye" className={inputClass} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        {onDelete ? (
          <button onClick={onDelete} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            Delete Bottle
          </button>
        ) : <div />}
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
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
