import { useState } from 'react';

interface StarRatingInputProps {
  rating: number | null;
  onChange: (rating: number | null) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function StarRatingInput({ rating, onChange, size = 'md' }: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const sizeClass = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const display = hovered ?? rating ?? 0;

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${sizeClass} transition-colors ${
            star <= display ? 'text-amber-400' : 'text-gray-300'
          } hover:scale-110`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => { const newRating = star === rating ? null : star; setHovered(null); onChange(newRating); }}
          title={star === rating ? 'Clear rating' : `${star} star${star > 1 ? 's' : ''}`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}
