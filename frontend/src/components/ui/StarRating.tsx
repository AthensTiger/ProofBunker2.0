interface StarRatingProps {
  rating: number | null;
  max?: number;
  size?: 'sm' | 'md';
}

export default function StarRating({ rating, max = 5, size = 'sm' }: StarRatingProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-lg';

  if (rating === null || rating === undefined) {
    return <span className={`text-gray-300 ${sizeClass}`}>--</span>;
  }

  return (
    <span className={sizeClass}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rating ? 'text-amber-500' : 'text-gray-300'}>
          &#9733;
        </span>
      ))}
    </span>
  );
}
