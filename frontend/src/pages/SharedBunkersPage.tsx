import { useNavigate } from 'react-router-dom';
import { useSharedBunkers } from '../hooks/useShares';

export default function SharedBunkersPage() {
  const navigate = useNavigate();
  const { data: bunkers = [], isLoading } = useSharedBunkers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shared With Me</h1>

      {bunkers.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">&#128101;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No shared bunkers</h2>
          <p className="text-gray-500">When someone shares their collection with you, it will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bunkers.map((bunker) => (
            <button
              key={bunker.id}
              onClick={() => navigate(`/shared/${bunker.id}`)}
              className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                {bunker.owner_avatar ? (
                  <img src={bunker.owner_avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                    {(bunker.owner_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{bunker.owner_name || 'Anonymous'}</p>
                  <p className="text-xs text-gray-500">Shared collection</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
