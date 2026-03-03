import { useState } from 'react';
import type { ResearchResult } from '../../types/product';

interface FieldDef {
  key: keyof ResearchResult;
  label: string;
  format?: (v: unknown) => string;
}

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Product Name' },
  { key: 'spirit_type', label: 'Spirit Type' },
  { key: 'spirit_subtype', label: 'Subtype' },
  { key: 'company_name', label: 'Company / Brand' },
  { key: 'distiller_name', label: 'Distiller' },
  { key: 'proof', label: 'Proof' },
  { key: 'abv', label: 'ABV', format: (v) => `${parseFloat((Number(v) * 100).toFixed(1))}%` },
  { key: 'age_statement', label: 'Age Statement' },
  { key: 'volume_ml', label: 'Volume', format: (v) => `${v} ml` },
  { key: 'mash_bill', label: 'Mash Bill' },
  { key: 'msrp_usd', label: 'MSRP', format: (v) => `$${v}` },
  { key: 'barrel_type', label: 'Barrel Type' },
  { key: 'finish_type', label: 'Finish Type' },
  { key: 'upc', label: 'UPC Barcode' },
  { key: 'description', label: 'Description' },
];

interface ResearchComparisonModalProps {
  result: ResearchResult;
  currentValues: Record<string, string | number | boolean | null | undefined>;
  onApply: (selected: Partial<ResearchResult>, selectedImageUrls: string[]) => void;
  onClose: () => void;
}

export default function ResearchComparisonModal({ result, currentValues, onApply, onClose }: ResearchComparisonModalProps) {
  // Only show fields where research returned a value
  const availableFields = FIELDS.filter((f) => {
    const v = result[f.key];
    return v != null && v !== '';
  });

  // Pre-check fields where the current value is empty
  const initialSelected = new Set<string>();
  for (const f of availableFields) {
    const cur = currentValues[f.key];
    if (cur == null || cur === '') {
      initialSelected.add(f.key);
    }
  }

  const [selectedFields, setSelectedFields] = useState<Set<string>>(initialSelected);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleImage = (index: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFields(new Set(availableFields.map((f) => f.key)));
    if (result.image_urls?.length) {
      setSelectedImages(new Set(result.image_urls.map((_, i) => i)));
    }
  };

  const deselectAll = () => {
    setSelectedFields(new Set());
    setSelectedImages(new Set());
  };

  const allSelected = selectedFields.size === availableFields.length &&
    (!result.image_urls?.length || selectedImages.size === result.image_urls.length);

  const totalSelected = selectedFields.size + selectedImages.size;

  const handleApply = () => {
    const partial: Partial<ResearchResult> = {};
    for (const key of selectedFields) {
      (partial as any)[key] = result[key as keyof ResearchResult];
    }
    const imageUrls = result.image_urls?.filter((_, i) => selectedImages.has(i)) || [];
    onApply(partial, imageUrls);
  };

  const formatValue = (field: FieldDef, value: unknown): string => {
    if (value == null || value === '') return '';
    if (field.format) return field.format(value);
    return String(value);
  };

  const confidence = Math.round((result.confidence ?? 0) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Research Results</h2>
            <p className="text-xs text-gray-500 mt-0.5">{confidence}% confidence &middot; {result.sources?.length || 0} sources</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={allSelected ? deselectAll : selectAll}
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-4 px-6 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
            <div />
            <div>Research Result</div>
            <div>Current Value</div>
          </div>

          {/* Field rows */}
          <div className="divide-y divide-gray-100">
            {availableFields.map((field) => {
              const researchVal = formatValue(field, result[field.key]);
              const currentVal = formatValue(field, currentValues[field.key]);
              const isDifferent = researchVal !== currentVal;
              const isSelected = selectedFields.has(field.key);

              return (
                <label
                  key={field.key}
                  className={`grid grid-cols-[2rem_1fr_1fr] gap-x-4 px-6 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start pt-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleField(field.key)}
                      className="rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{field.label}</p>
                    <p className={`text-sm break-words ${isDifferent ? 'font-medium text-amber-800' : 'text-gray-900'}`}>
                      {researchVal}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{field.label}</p>
                    {currentVal ? (
                      <p className="text-sm text-gray-700 break-words">{currentVal}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">empty</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Image suggestions */}
          {result.image_urls && result.image_urls.length > 0 && (
            <div className="px-6 py-4 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Image Suggestions</p>
              <div className="flex flex-wrap gap-3">
                {result.image_urls.map((url, i) => {
                  const isImgSelected = selectedImages.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleImage(i)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                        isImgSelected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Suggestion ${i + 1}`}
                        className="w-20 h-20 object-cover"
                        onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                      />
                      {isImgSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <div className="px-6 py-3 border-t bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sources</p>
              <div className="space-y-0.5">
                {result.sources.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:text-blue-800 truncate"
                  >
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={totalSelected === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Apply Selected ({totalSelected})
          </button>
        </div>
      </div>
    </div>
  );
}
