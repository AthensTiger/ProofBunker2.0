import { useParams, useNavigate } from 'react-router-dom';
import { useSharedBunkerItems } from '../hooks/useShares';
import StarRating from '../components/ui/StarRating';

export default function SharedBunkerViewPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSharedBunkerItems(shareId!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Shared bunker not found.</p>
        <button onClick={() => navigate('/shared')} className="text-amber-700 mt-4">
          Back to Shared
        </button>
      </div>
    );
  }

  const { share, items } = data;
  const vis = share.visibility;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/shared')}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          &larr; Back to Shared
        </button>
        <span className="text-sm text-gray-500">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">This collection is empty.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {vis.show_photos && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Img</th>}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Proof</th>
                {vis.show_ratings && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>}
                {vis.show_quantities && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>}
                {vis.show_locations && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Locations</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {vis.show_photos && (
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
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.company_name || '--'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell capitalize">{item.spirit_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{item.proof || '--'}</td>
                  {vis.show_ratings && (
                    <td className="px-4 py-3">
                      <StarRating rating={item.personal_rating ?? null} />
                    </td>
                  )}
                  {vis.show_quantities && (
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.bottle_count ?? '--'}</td>
                  )}
                  {vis.show_locations && (
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {item.location_names && item.location_names.length > 0 ? item.location_names.join(', ') : '--'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
