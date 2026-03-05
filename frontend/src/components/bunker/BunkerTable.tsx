import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import type { BunkerListItem, BunkerCardFields } from '../../types/bunker';
import StarRatingInput from '../ui/StarRatingInput';
import Badge from '../ui/Badge';
import { formatProof, formatAbv, formatAgeStatement } from '../../utils/format';

interface BunkerTableProps {
  items: BunkerListItem[];
  showImages: boolean;
  cardFields: BunkerCardFields;
  onStatusAction: (bottleId: number, newStatus: 'opened' | 'empty') => void;
  onDelete: (item: BunkerListItem) => void;
  onRatingChange: (itemId: number, rating: number | null) => void;
}

function buildDetailSummary(item: BunkerListItem): string {
  const parts: string[] = [];
  if (item.batch_number) parts.push(`Batch: ${item.batch_number}`);
  if (item.barrel_number) parts.push(`Barrel: ${item.barrel_number}`);
  if (item.year_distilled != null) parts.push(`Dist. ${item.year_distilled}`);
  if (item.proof != null) parts.push(`${formatProof(item.proof)}pf`);
  else if (item.abv != null) parts.push(`${formatAbv(item.abv)} ABV`);
  if (item.age_statement) parts.push(formatAgeStatement(item.age_statement));
  if (item.release_year != null) parts.push(`Rel. ${item.release_year}`);
  return parts.join(' · ');
}

function rowKey(item: BunkerListItem): string {
  return [
    item.id,
    item.batch_number ?? '',
    item.barrel_number ?? '',
    item.year_distilled ?? '',
    item.proof ?? '',
    item.abv ?? '',
    item.age_statement ?? '',
    item.release_year ?? '',
    item.mash_bill ?? '',
  ].join('|');
}

function BunkerCard({
  item,
  showImages,
  cardFields,
  onStatusAction,
  onDelete,
  onRatingChange,
  navigate,
}: {
  item: BunkerListItem;
  showImages: boolean;
  cardFields: BunkerCardFields;
  onStatusAction: (bottleId: number, newStatus: 'opened' | 'empty') => void;
  onDelete: (item: BunkerListItem) => void;
  onRatingChange: (itemId: number, rating: number | null) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const detailSummary = buildDetailSummary(item);
  const [localRating, setLocalRating] = useState<number | null>(item.personal_rating);

  useEffect(() => {
    setLocalRating(item.personal_rating);
  }, [item.personal_rating]);

  // Build meta chips based on visible fields
  const metaParts: string[] = [];
  if (cardFields.show_company && item.company_name) metaParts.push(item.company_name);
  if (cardFields.show_type) {
    if (item.spirit_subtype) metaParts.push(`${item.spirit_subtype} (${item.spirit_type})`);
    else if (item.spirit_type) metaParts.push(item.spirit_type);
  }
  if (cardFields.show_abv && item.abv != null) {
    metaParts.push(formatAbv(item.abv));
  }
  if (cardFields.show_location && item.location_names.length > 0) {
    metaParts.push(item.location_names.join(', '));
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 mx-4 cursor-pointer active:bg-gray-50 transition-colors"
      onClick={() => navigate(`/bunker/${item.id}`)}
    >
      <div className="flex items-start gap-3">
        {/* Image — only shown when enabled and an image exists */}
        {showImages && item.image_url && (
          <div className="flex-shrink-0">
            <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover object-right" />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</span>
                {item.bottle_count > 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    ×{item.bottle_count}
                  </span>
                )}
                {item.approval_status === 'pending' && <Badge variant="pending">Pending</Badge>}
                {item.approval_status === 'rejected' && <Badge variant="rejected">Rejected</Badge>}
              </div>
              {cardFields.show_details && detailSummary && (
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{detailSummary}</p>
              )}
            </div>

            {/* Action button */}
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
              {(item.location_names.length > 1 || item.statuses.length > 1) ? (
                <button
                  onClick={() => navigate(`/bunker/${item.id}`)}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
                >
                  Multiple
                </button>
              ) : item.primary_status === 'sealed' && item.primary_bottle_id ? (
                <button
                  onClick={() => onStatusAction(item.primary_bottle_id!, 'opened')}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900"
                >
                  Open
                </button>
              ) : item.primary_status === 'opened' && item.primary_bottle_id ? (
                <button
                  onClick={() => onStatusAction(item.primary_bottle_id!, 'empty')}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900"
                >
                  Empty
                </button>
              ) : item.primary_status === 'empty' ? (
                <button
                  onClick={() => onDelete(item)}
                  className="text-xs font-medium text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          {/* Meta row */}
          {(metaParts.length > 0 || cardFields.show_status) && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-2">
              {metaParts.map((part, i) => (
                <span key={i}>{part}</span>
              ))}
              {cardFields.show_status && item.statuses.length > 0 && (
                <span className={`capitalize font-medium ${
                  item.primary_status === 'sealed'
                    ? 'text-green-600'
                    : item.primary_status === 'opened'
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}>
                  {item.statuses.join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Mash Bill */}
          {cardFields.show_mash_bill && item.mash_bill && (
            <p className="text-xs text-gray-500 mb-1">Mash: {item.mash_bill}</p>
          )}

          {/* Description */}
          {cardFields.show_description && item.description && (
            <p className="text-xs text-gray-500 mb-1 line-clamp-2">{item.description}</p>
          )}

          {/* Personal Notes */}
          {cardFields.show_notes && item.notes && (
            <p className="text-xs text-gray-500 italic mb-1 line-clamp-2">{item.notes}</p>
          )}

          {/* Rating */}
          {cardFields.show_rating && (
            <div onClick={(e) => e.stopPropagation()}>
              <StarRatingInput
                rating={localRating}
                onChange={(r) => { setLocalRating(r); onRatingChange(item.id, r); }}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BunkerTable({ items, showImages, cardFields, onStatusAction, onDelete, onRatingChange }: BunkerTableProps) {
  const navigate = useNavigate();

  return (
    <Virtuoso
      useWindowScroll
      data={items}
      computeItemKey={(_, item) => rowKey(item)}
      itemContent={(_, item) => (
        <BunkerCard
          item={item}
          showImages={showImages}
          cardFields={cardFields}
          onStatusAction={onStatusAction}
          onDelete={onDelete}
          onRatingChange={onRatingChange}
          navigate={navigate}
        />
      )}
    />
  );
}
