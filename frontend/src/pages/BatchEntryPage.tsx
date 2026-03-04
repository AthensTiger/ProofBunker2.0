import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAddToBunker } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useUIStore } from '../stores/uiStore';
import { useUpcLookup } from '../hooks/useProducts';
import type { UpcLookupResult } from '../types/product';
import BarcodeScannerModal from '../components/ui/BarcodeScannerModal';

interface BatchEntry {
  id: string;
  product: UpcLookupResult;
  upc: string;
}

export default function BatchEntryPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const { data: locations = [] } = useLocations();
  const addMutation = useAddToBunker();

  const [upcInput, setUpcInput] = useState('');
  const [searchUpc, setSearchUpc] = useState('');
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [locationId, setLocationId] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const { data: lookupResult, error: lookupError, isFetching } = useUpcLookup(searchUpc);

  // Handle lookup result
  if (lookupResult && searchUpc) {
    const entry: BatchEntry = {
      id: Date.now().toString(),
      product: lookupResult,
      upc: searchUpc,
    };
    setEntries((prev) => [entry, ...prev]);
    setSearchUpc('');
    setUpcInput('');
    addToast('success', `Found: ${lookupResult.name}`);
  }

  if (lookupError && searchUpc) {
    addToast('error', `No product found for UPC: ${searchUpc}`);
    setSearchUpc('');
    setUpcInput('');
  }

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = upcInput.trim();
    if (cleaned.length < 8) return;
    setSearchUpc(cleaned);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleDone = async () => {
    if (entries.length === 0) {
      navigate('/bunker');
      return;
    }

    setSaving(true);
    let successCount = 0;

    for (const entry of entries) {
      try {
        await addMutation.mutateAsync({
          product_id: entry.product.id,
          storage_location_id: locationId ?? null,
          status: 'sealed',
        });
        successCount++;
      } catch {
        // Continue on error
      }
    }

    addToast('success', `Added ${successCount} of ${entries.length} bottles to bunker`);
    setSaving(false);
    navigate('/bunker');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Batch Entry</h1>
        <button
          onClick={() => navigate('/bunker')}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Location</label>
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

        <form onSubmit={handleScan} className="flex gap-2">
          <input
            type="text"
            value={upcInput}
            onChange={(e) => setUpcInput(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Scan or enter UPC..."
            autoFocus
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            maxLength={14}
          />
          <button
            type="button"
            onClick={() => setScanning(true)}
            title="Scan with camera"
            className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <button
            type="submit"
            disabled={upcInput.trim().length < 8 || isFetching}
            className="px-4 py-3 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
          >
            {isFetching ? 'Looking up...' : 'Add'}
          </button>
        </form>
      </div>

      {entries.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase mb-3">
            Scanned ({entries.length})
          </h2>
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  {entry.product.image_url ? (
                    <img src={entry.product.image_url} alt="" className="w-8 h-8 rounded object-cover object-right" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-100" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.product.name}</p>
                    <p className="text-xs text-gray-500">UPC: {entry.upc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveEntry(entry.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleDone}
          disabled={saving}
          className="px-6 py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : entries.length > 0 ? `Done (Add ${entries.length} bottles)` : 'Done'}
        </button>
      </div>

      {scanning && (
        <BarcodeScannerModal
          onScan={(code) => {
            setUpcInput(code);
            setSearchUpc(code);
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
