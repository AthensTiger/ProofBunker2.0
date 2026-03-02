import { useRef, useState } from 'react';
import { useUploadBottlePhoto, useUploadBottlePhotoFromUrl } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import CameraCapture from './CameraCapture';

interface PhotoUploadProps {
  bottleId: number;
  currentCount: number;
  maxPhotos?: number;
}

export default function PhotoUpload({ bottleId, currentCount, maxPhotos = 5 }: PhotoUploadProps) {
  const addToast = useUIStore((s) => s.addToast);
  const uploadMutation = useUploadBottlePhoto();
  const urlMutation = useUploadBottlePhotoFromUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  const canUpload = currentCount < maxPhotos;

  const uploadFile = (file: File) => {
    uploadMutation.mutate(
      { bottleId, file },
      {
        onSuccess: () => addToast('success', 'Photo uploaded'),
        onError: () => addToast('error', 'Failed to upload photo'),
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUrlSubmit = () => {
    const url = urlValue.trim();
    if (!url) return;
    urlMutation.mutate(
      { bottleId, url },
      {
        onSuccess: () => { addToast('success', 'Photo added from URL'); setUrlValue(''); setShowUrl(false); },
        onError: () => addToast('error', 'Failed to fetch image from URL'),
      }
    );
  };

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    uploadFile(file);
  };

  if (!canUpload) return null;

  const isUploading = uploadMutation.isPending || urlMutation.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* File upload */}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id={`photo-upload-${bottleId}`} />
        <label
          htmlFor={`photo-upload-${bottleId}`}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded cursor-pointer transition-colors ${
            isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          {isUploading ? 'Uploading...' : '+ File'}
        </label>

        {/* URL toggle */}
        <button
          onClick={() => setShowUrl(!showUrl)}
          disabled={isUploading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          + URL
        </button>

        {/* Camera toggle */}
        <button
          onClick={() => setShowCamera(true)}
          disabled={isUploading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          + Camera
        </button>
      </div>

      {/* URL input */}
      {showUrl && (
        <div className="flex gap-2">
          <input
            type="text"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim() || urlMutation.isPending}
            className="px-2 py-1 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded disabled:opacity-50"
          >
            {urlMutation.isPending ? '...' : 'Add'}
          </button>
          <button onClick={() => { setShowUrl(false); setUrlValue(''); }} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      )}

      {/* Camera capture modal */}
      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
