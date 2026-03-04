import { useState, useRef, useEffect } from 'react';
import { useAutocomplete } from '../../hooks/useProducts';
import type { AutocompleteResult } from '../../types/product';

interface ProductSearchProps {
  onSelect: (product: AutocompleteResult) => void;
}

export default function ProductSearch({ onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: results = [] } = useAutocomplete(query);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (product: AutocompleteResult) => {
    onSelect(product);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder="Start typing a product name..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors text-left"
            >
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover object-right flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                  No img
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {product.company_name && `${product.company_name} · `}
                  <span className="capitalize">{product.spirit_type}</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
