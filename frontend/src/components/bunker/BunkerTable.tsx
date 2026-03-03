import { useNavigate } from 'react-router-dom';
import type { BunkerListItem } from '../../types/bunker';
import StarRatingInput from '../ui/StarRatingInput';
import Badge from '../ui/Badge';

interface BunkerTableProps {
  items: BunkerListItem[];
  showImages: boolean;
  onStatusAction: (bottleId: number, newStatus: 'opened' | 'empty') => void;
  onDelete: (item: BunkerListItem) => void;
  onRatingChange: (itemId: number, rating: number | null) => void;
}

export default function BunkerTable({ items, showImages, onStatusAction, onDelete, onRatingChange }: BunkerTableProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showImages && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Img</th>}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Company</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">ABV</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Locations</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">Change Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/bunker/${item.id}`)}
            >
              {showImages && (
                <td className="px-4 py-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                      No img
                    </div>
                  )}
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                  {item.approval_status === 'pending' && <Badge variant="pending">Pending</Badge>}
                  {item.approval_status === 'rejected' && <Badge variant="rejected">Rejected</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.company_name || '--'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell capitalize">
                {item.spirit_subtype
                  ? <>{item.spirit_subtype} <span className="text-gray-400 text-xs normal-case">({item.spirit_type})</span></>
                  : item.spirit_type}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{item.abv != null ? `${parseFloat((Number(item.abv) * 100).toFixed(1))}%` : '--'}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <StarRatingInput rating={item.personal_rating} onChange={(r) => onRatingChange(item.id, r)} size="sm" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.bottle_count}</td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                {item.location_names.length > 0 ? item.location_names.join(', ') : '--'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell capitalize">
                {item.statuses.length > 0 ? item.statuses.join(', ') : '--'}
              </td>
              <td className="px-4 py-3 text-right">
                {(item.location_names.length > 1 || item.statuses.length > 1) ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/bunker/${item.id}`); }}
                    className="text-sm font-medium text-amber-700 hover:text-amber-900"
                  >
                    Multiple
                  </button>
                ) : item.primary_status === 'sealed' && item.primary_bottle_id ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusAction(item.primary_bottle_id!, 'opened'); }}
                    className="text-sm font-medium text-amber-700 hover:text-amber-900"
                  >
                    Open
                  </button>
                ) : item.primary_status === 'opened' && item.primary_bottle_id ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusAction(item.primary_bottle_id!, 'empty'); }}
                    className="text-sm font-medium text-amber-700 hover:text-amber-900"
                  >
                    Empty
                  </button>
                ) : item.primary_status === 'empty' ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                    className="text-sm font-medium text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
