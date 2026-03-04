import { Link } from 'react-router-dom';

interface BunkerActionRowProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  onOpenSettings: () => void;
  hasActiveFilters: boolean;
}

export default function BunkerActionRow({
  searchText,
  onSearchChange,
  onOpenSettings,
  hasActiveFilters,
}: BunkerActionRowProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Link
        to="/add-bottle"
        className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors whitespace-nowrap"
      >
        Add Bottle
      </Link>
      <Link
        to="/batch-entry"
        className="border border-amber-700 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors whitespace-nowrap"
      >
        Batch Scan
      </Link>

      <div className="flex-1 min-w-0">
        <input
          type="text"
          placeholder="Search bottles..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Settings gear */}
      <button
        onClick={onOpenSettings}
        title="List settings"
        className={`p-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? 'bg-amber-100 border-amber-300 text-amber-800'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
}
