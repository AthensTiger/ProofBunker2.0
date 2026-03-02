import { useState, useRef, useEffect, type ReactNode } from 'react';

interface ComboboxProps<T> {
  label: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: T) => void;
  results: T[];
  renderItem: (item: T) => ReactNode;
  getItemLabel: (item: T) => string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function Combobox<T>({
  label,
  value,
  onChange,
  onSelect,
  results,
  renderItem,
  getItemLabel,
  placeholder,
  required,
  className,
}: ComboboxProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSelect = (item: T) => {
    onChange(getItemLabel(item));
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ''}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => { if (value.length >= 2) setIsOpen(true); }}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((item, idx) => (
            <button
              key={idx}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              className="w-full px-3 py-2 hover:bg-amber-50 transition-colors text-left text-sm"
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
