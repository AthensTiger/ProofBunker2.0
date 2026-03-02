import { Link } from 'react-router-dom';

export default function BunkerEmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">&#127867;</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your bunker is empty</h2>
      <p className="text-gray-500 mb-8">Start building your collection by adding your first bottle.</p>
      <div className="flex gap-4 justify-center">
        <Link
          to="/add-bottle"
          className="bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-800 transition-colors"
        >
          Add Your First Bottle
        </Link>
        <Link
          to="/batch-entry"
          className="border border-amber-700 text-amber-700 px-6 py-3 rounded-lg font-semibold hover:bg-amber-50 transition-colors"
        >
          Start Batch Scan
        </Link>
      </div>
    </div>
  );
}
