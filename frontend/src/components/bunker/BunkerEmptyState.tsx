import { Link } from 'react-router-dom';

export default function BunkerEmptyState() {
  return (
    <div className="text-center py-20">
      <div className="flex justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 96" className="h-20 w-auto text-amber-700" fill="currentColor" aria-hidden="true">
          {/* Cap */}
          <rect x="17" y="0" width="14" height="7" rx="2"/>
          {/* Neck */}
          <rect x="18" y="7" width="12" height="16" rx="1"/>
          {/* Shoulder taper */}
          <path d="M18 23 C18 23 8 32 6 42 L42 42 C40 32 30 23 30 23 Z"/>
          {/* Body */}
          <rect x="6" y="42" width="36" height="52" rx="4"/>
          {/* Label */}
          <rect x="10" y="50" width="28" height="34" rx="2" fill="white" fillOpacity="0.18"/>
        </svg>
      </div>
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
