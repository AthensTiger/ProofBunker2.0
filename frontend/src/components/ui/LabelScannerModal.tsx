import { useState, useRef } from 'react';
import { useScanLabel } from '../../hooks/useProducts';

interface LabelScanResult {
  name: string | null;
  spirit_type: string | null;
  spirit_subtype: string | null;
  company_name: string | null;
  distiller_name: string | null;
  proof: number | null;
  abv: number | null;
  age_statement: string | null;
  description: string | null;
  mash_bill: string | null;
  barrel_type: string | null;
  finish_type: string | null;
  volume_ml: number | null;
  batch_number: string | null;
  barrel_number: string | null;
  confidence: number;
  notes: string;
}

interface LabelScannerModalProps {
  onResult: (data: LabelScanResult) => void;
  onClose: () => void;
  productName?: string;
}

export default function LabelScannerModal({ onResult, onClose, productName }: LabelScannerModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; media_type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanLabel = useScanLabel();

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    // Resize image to reduce payload size
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPreview(dataUrl);
        const base64 = dataUrl.split(',')[1];
        setImageData({ base64, media_type: 'image/jpeg' });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleScan = () => {
    if (!imageData) return;
    scanLabel.mutate(
      { image: imageData.base64, media_type: imageData.media_type },
      {
        onSuccess: (data) => onResult(data),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scan Bottle Label</h2>
            {productName && (
              <p className="text-sm text-gray-500 mt-0.5">Verify: {productName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {!preview ? (
            <>
              <p className="text-sm text-gray-600">
                Take a clear photo of the front label on the bottle. Make sure the product name, proof/ABV, and any other details are readable.
              </p>

              <div className="flex flex-col gap-3">
                {/* Camera capture (mobile) */}
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFile(file);
                    };
                    input.click();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  Take Photo
                </button>

                {/* File upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCapture}
                  className="hidden"
                />
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="relative">
                <img src={preview} alt="Label preview" className="w-full rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setPreview(null); setImageData(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/70"
                >
                  &times;
                </button>
              </div>

              {scanLabel.isError && (
                <p className="text-sm text-red-600">
                  {(scanLabel.error as any)?.message || 'Scan failed. Please try again.'}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setPreview(null); setImageData(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={scanLabel.isPending}
                  className="flex-1 px-4 py-2.5 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors disabled:opacity-50"
                >
                  {scanLabel.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Reading Label...
                    </span>
                  ) : 'Read Label'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
