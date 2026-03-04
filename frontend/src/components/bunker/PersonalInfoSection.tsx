import { useState, useEffect, useRef } from 'react';
import { useUpdateBunkerItem } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import StarRatingInput from '../ui/StarRatingInput';

interface PersonalInfoSectionProps {
  itemId: number;
  rating: number | null;
  notes: string | null;
}

export default function PersonalInfoSection({ itemId, rating, notes }: PersonalInfoSectionProps) {
  const addToast = useUIStore((s) => s.addToast);
  const updateMutation = useUpdateBunkerItem();
  const [localRating, setLocalRating] = useState<number | null>(rating);
  const [localNotes, setLocalNotes] = useState(notes || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalRating(rating);
  }, [rating]);

  useEffect(() => {
    setLocalNotes(notes || '');
  }, [notes]);

  const handleRatingChange = (newRating: number | null) => {
    setLocalRating(newRating);
    updateMutation.mutate(
      { id: itemId, personal_rating: newRating },
      {
        onSuccess: () => addToast('success', 'Rating saved'),
        onError: () => {
          setLocalRating(rating); // revert on error
          addToast('error', 'Failed to save rating');
        },
      }
    );
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateMutation.mutate(
        { id: itemId, notes: value || null },
        { onError: () => addToast('error', 'Failed to save notes') }
      );
    }, 800);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Notes</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
        <StarRatingInput rating={localRating} onChange={handleRatingChange} size="lg" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Your personal tasting notes, thoughts..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
        />
      </div>
    </div>
  );
}
