import { useState } from 'react';
import { useUpcLookup } from '../../hooks/useProducts';
import type { UpcLookupResult } from '../../types/product';
import BarcodeScannerModal from '../ui/BarcodeScannerModal';

interface ManualUpcInputProps {
  onFound: (product: UpcLookupResult) => void;
  onNotFound: (upc: string) => void;
}

export default function ManualUpcInput({ onFound, onNotFound }: ManualUpcInputProps) {
  const [upc, setUpc] = useState('');
  const [searchUpc, setSearchUpc] = useState('');
  const [scanning, setScanning] = useState(false);
  const { data, isLoading, error } = useUpcLookup(searchUpc);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = upc.trim();
    if (cleaned.length < 8) return;
    setSearchUpc(cleaned);
  };

  const handleCameraScan = (scanned: string) => {
    setUpc(scanned);
    setSearchUpc(scanned);
  };

  // Auto-handle results
  if (data && searchUpc) {
    onFound(data);
    setSearchUpc('');
    setUpc('');
  }

  if (error && searchUpc) {
    onNotFound(searchUpc);
    setSearchUpc('');
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700 mb-1">UPC Barcode</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={upc}
            onChange={(e) => setUpc(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Enter UPC barcode number..."
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
            disabled={upc.trim().length < 8 || isLoading}
            className="px-4 py-3 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
      </form>

      {scanning && (
        <BarcodeScannerModal
          onScan={handleCameraScan}
          onClose={() => setScanning(false)}
        />
      )}
    </>
  );
}
