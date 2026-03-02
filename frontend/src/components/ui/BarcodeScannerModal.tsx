import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onScan, onClose }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const scannedRef = useRef(false);

  // Keep refs current without re-running the effect
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!videoRef.current) return;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result) => {
          if (result && !scannedRef.current) {
            const code = result.getText();
            // Only accept numeric UPC/EAN barcodes
            if (/^\d{8,14}$/.test(code)) {
              scannedRef.current = true;
              onScanRef.current(code);
              onCloseRef.current();
            }
          }
        }
      )
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((err) => {
        console.error('Camera error:', err);
      });

    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <span className="text-white font-semibold text-lg">Scan Barcode</span>
        <button
          onClick={onClose}
          className="text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Close scanner"
        >
          ✕
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scan guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-72 h-28 rounded-lg border-2 border-amber-400/80" />
            {/* Corner accents */}
            <div className="absolute -top-0.5 -left-0.5 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
            <div className="absolute -top-0.5 -right-0.5 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
            <div className="absolute -bottom-0.5 -left-0.5 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
            <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
          </div>
        </div>

        {/* Dim everything outside the guide area */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 300px 120px at 50% 50%, transparent 80%, rgba(0,0,0,0.6) 100%)'
        }} />
      </div>

      <p className="text-white/80 text-center py-4 text-sm bg-black/60">
        Point camera at the barcode on the bottle
      </p>
    </div>
  );
}
