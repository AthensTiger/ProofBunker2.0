import { useRef, useState } from 'react';
import { useLocations } from '../../hooks/useLocations';
import { useCreateUnresolvedScan, useUploadUnresolvedScanPhoto } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';

interface Props {
  upc: string;
  onSaved: () => void;
  onSubmitNew: () => void;
}

export default function SaveForLaterForm({ upc, onSaved, onSubmitNew }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const { data: locations = [] } = useLocations();
  const createScan = useCreateUnresolvedScan();
  const uploadPhoto = useUploadUnresolvedScanPhoto();

  const [locationId, setLocationId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPending = createScan.isPending || uploadPhoto.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 2 - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPreviews((prev) => [...prev, url]);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      const scan = await createScan.mutateAsync({
        upc,
        storage_location_id: locationId !== '' ? locationId : null,
        notes: notes.trim() || undefined,
      });

      for (const file of photos) {
        await uploadPhoto.mutateAsync({ id: scan.id, file });
      }

      addToast('success', 'Barcode saved — resolve it later from My Bunker');
      onSaved();
    } catch {
      addToast('error', 'Failed to save barcode');
    }
  };

  return (
    <div className="space-y-4">
      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Storage Location</label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">— None —</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. shelf 3, bottom row"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Photos (optional, up to 2)</label>
        {previews.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {previews.map((src, idx) => (
              <div key={idx} className="relative">
                <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 2 && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-400 hover:text-amber-700 transition-colors"
            >
              + Add Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-2.5 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save for Later'}
        </button>
        <button
          type="button"
          onClick={onSubmitNew}
          className="text-sm text-amber-700 hover:text-amber-900 underline underline-offset-2 text-center"
        >
          Submit a new product instead →
        </button>
      </div>
    </div>
  );
}
