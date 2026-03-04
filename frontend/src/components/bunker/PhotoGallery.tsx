import { useState } from 'react';
import type { BottlePhoto } from '../../types/bunker';
import { useDeleteBottlePhoto } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import Lightbox from '../ui/Lightbox';

interface PhotoGalleryProps {
  photos: BottlePhoto[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const addToast = useUIStore((s) => s.addToast);
  const deleteMutation = useDeleteBottlePhoto();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const handleDelete = (photoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this photo?')) return;
    deleteMutation.mutate(photoId, {
      onSuccess: () => addToast('success', 'Photo deleted'),
      onError: () => addToast('error', 'Failed to delete photo'),
    });
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {photos.map((photo, idx) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.cdn_url}
              alt=""
              className="w-16 h-16 object-cover object-right rounded cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxIndex(idx)}
            />
            <button
              onClick={(e) => handleDelete(photo.id, e)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="Delete photo"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
