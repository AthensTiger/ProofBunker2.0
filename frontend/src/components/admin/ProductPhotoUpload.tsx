import { useRef, useState } from 'react';
import { useUploadProductImage, useUploadProductImageFromUrl, useDeleteProductImage } from '../../hooks/useAdmin';
import { useUIStore } from '../../stores/uiStore';
import CameraCapture from '../bunker/CameraCapture';

interface ProductPhotoUploadProps {
  productId: number;
  images: { id: number; cdn_url: string | null; is_primary: boolean }[];
}

export default function ProductPhotoUpload({ productId, images }: ProductPhotoUploadProps) {
  const addToast = useUIStore((s) => s.addToast);
  const uploadMutation = useUploadProductImage();
  const urlMutation = useUploadProductImageFromUrl();
  const deleteMutation = useDeleteProductImage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  const isUploading = uploadMutation.isPending || urlMutation.isPending;

  const uploadFile = (file: File) => {
    uploadMutation.mutate(
      { productId, file },
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
      { productId, url },
      {
        onSuccess: () => { addToast('success', 'Photo added from URL'); setUrlValue(''); setShowUrl(false); },
        onError: () => addToast('error', 'Failed to fetch image from URL'),
      }
    );
  };

  const handleDelete = (imageId: number) => {
    if (!confirm('Delete this image?')) return;
    deleteMutation.mutate(imageId, {
      onSuccess: () => addToast('success', 'Image deleted'),
      onError: () => addToast('error', 'Failed to delete image'),
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Product Images</label>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group w-20 h-20">
              <img
                src={img.cdn_url || ''}
                alt=""
                className={`w-full h-full object-cover object-right rounded-lg ${img.is_primary ? 'ring-2 ring-amber-500' : ''}`}
              />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                x
              </button>
              {img.is_primary && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] bg-amber-500 text-white rounded-b-lg">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload controls */}
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id={`product-photo-${productId}`} />
        <label
          htmlFor={`product-photo-${productId}`}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded cursor-pointer transition-colors ${
            isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          {isUploading ? 'Uploading...' : '+ File'}
        </label>
        <button
          onClick={() => setShowUrl(!showUrl)}
          disabled={isUploading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          + URL
        </button>
        <button
          onClick={() => setShowCamera(true)}
          disabled={isUploading}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          + Camera
        </button>
      </div>

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

      {showCamera && (
        <CameraCapture onCapture={(file) => { setShowCamera(false); uploadFile(file); }} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
