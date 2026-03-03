import { useState } from 'react';
import { useUpdateBunkerItem } from '../../hooks/useBunker';
import { useUIStore } from '../../stores/uiStore';
import type { BunkerItemDetail } from '../../types/bunker';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number';
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  // If set, this field COALESCEs with a product value
  productKey?: keyof BunkerItemDetail;
  // ABV is stored as a fraction (0.45) but displayed/entered as percentage (45.0)
  isAbv?: boolean;
}

const FIELDS: FieldConfig[] = [
  { key: 'batch_number',   label: 'Batch #',       type: 'text',   placeholder: 'e.g., Batch 7' },
  { key: 'barrel_number',  label: 'Barrel #',      type: 'text',   placeholder: 'e.g., 12B' },
  { key: 'year_distilled', label: 'Year Distilled', type: 'number', min: 1800, max: 2099, placeholder: 'e.g., 2019' },
  { key: 'release_year',   label: 'Release Year',  type: 'number', min: 1800, max: 2099, placeholder: 'e.g., 2022', productKey: 'product_release_year' },
  { key: 'proof',          label: 'Proof',         type: 'number', step: 0.1, min: 0, placeholder: 'e.g., 90.0', productKey: 'product_proof' },
  { key: 'abv',            label: 'ABV',           type: 'number', step: 0.1, min: 0, max: 100, placeholder: 'e.g., 45.0', productKey: 'product_abv', isAbv: true },
  { key: 'age_statement',  label: 'Age Statement', type: 'text',   placeholder: 'e.g., 12 Year', productKey: 'product_age_statement' },
  { key: 'mash_bill',      label: 'Mash Bill',     type: 'text',   placeholder: 'e.g., 75% corn, 21% rye', productKey: 'product_mash_bill' },
];

// Keys that correspond to per-user override fields on bunker_items
const OVERRIDE_KEY_MAP: Record<string, keyof BunkerItemDetail> = {
  proof: 'override_proof',
  abv: 'override_abv',
  age_statement: 'override_age_statement',
  mash_bill: 'override_mash_bill',
  release_year: 'override_release_year',
};

function formatAbv(fraction: number | null | undefined): string {
  if (fraction == null) return '';
  return parseFloat((Number(fraction) * 100).toFixed(2)).toString();
}

function displayValue(field: FieldConfig, item: BunkerItemDetail): string {
  const overrideKey = OVERRIDE_KEY_MAP[field.key] as keyof BunkerItemDetail | undefined;
  const rawOverride = overrideKey ? item[overrideKey] : item[field.key as keyof BunkerItemDetail];

  if (rawOverride != null) {
    if (field.isAbv) return `${formatAbv(rawOverride as number)}%`;
    return String(rawOverride);
  }

  if (field.productKey) {
    const productVal = item[field.productKey];
    if (productVal != null) {
      if (field.isAbv) return `${formatAbv(productVal as number)}%`;
      return String(productVal);
    }
  }

  return '—';
}

function isOverridden(field: FieldConfig, item: BunkerItemDetail): boolean {
  const overrideKey = OVERRIDE_KEY_MAP[field.key] as keyof BunkerItemDetail | undefined;
  if (overrideKey) return item[overrideKey] != null;
  return item[field.key as keyof BunkerItemDetail] != null;
}

function hasProductValue(field: FieldConfig, item: BunkerItemDetail): boolean {
  if (!field.productKey) return false;
  return item[field.productKey] != null;
}

interface Props {
  item: BunkerItemDetail;
}

export default function OverrideDetailsSection({ item }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const updateMutation = useUpdateBunkerItem();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const openEdit = (field: FieldConfig) => {
    const overrideKey = OVERRIDE_KEY_MAP[field.key] as keyof BunkerItemDetail | undefined;
    const currentOverride = overrideKey
      ? item[overrideKey]
      : item[field.key as keyof BunkerItemDetail];

    const initVal = currentOverride != null
      ? (field.isAbv ? formatAbv(currentOverride as number) : String(currentOverride))
      : '';

    setDraft(initVal);
    setEditingField(field.key);
  };

  const save = (field: FieldConfig) => {
    let val: string | number | null;
    if (draft.trim() === '') {
      val = null;
    } else if (field.type === 'number') {
      const n = parseFloat(draft);
      if (isNaN(n)) { addToast('error', 'Invalid number'); return; }
      val = field.isAbv ? parseFloat((n / 100).toFixed(6)) : n;
    } else {
      val = draft.trim() || null;
    }

    updateMutation.mutate(
      { id: item.id, [field.key]: val },
      {
        onSuccess: () => { setEditingField(null); addToast('success', `${field.label} updated`); },
        onError: () => addToast('error', `Failed to update ${field.label}`),
      }
    );
  };

  const clear = (field: FieldConfig) => {
    updateMutation.mutate(
      { id: item.id, [field.key]: null },
      {
        onSuccess: () => addToast('success', `${field.label} cleared`),
        onError: () => addToast('error', `Failed to clear ${field.label}`),
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-baseline gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Bottle Details</h2>
        <span className="text-xs text-gray-400">Personal overrides — only visible to you</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
        {FIELDS.map((field) => {
          const overridden = isOverridden(field, item);
          const hasProduct = hasProductValue(field, item);
          const displayed = displayValue(field, item);
          const isEditing = editingField === field.key;

          return (
            <div key={field.key} className="flex items-center py-2 border-b border-gray-100 last:border-0 sm:last:border-0 gap-2 min-w-0">
              <span className="w-32 flex-shrink-0 text-xs font-medium text-gray-500">{field.label}</span>

              {isEditing ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type={field.type}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') save(field);
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                    placeholder={field.placeholder}
                    autoFocus
                    className="w-28 px-2 py-1 text-sm border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {field.isAbv && <span className="text-xs text-gray-400">%</span>}
                  <button
                    onClick={() => save(field)}
                    disabled={updateMutation.isPending}
                    className="text-xs text-white bg-amber-700 hover:bg-amber-800 px-2 py-1 rounded disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-1 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-sm truncate ${overridden ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {displayed}
                  </span>
                  {overridden && field.productKey && (
                    <span className="flex-shrink-0 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      override
                    </span>
                  )}
                  {!overridden && hasProduct && (
                    <span className="flex-shrink-0 text-[10px] text-gray-400 italic">product</span>
                  )}
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    <button
                      onClick={() => openEdit(field)}
                      className="text-xs text-amber-700 hover:text-amber-800"
                    >
                      {overridden || (!field.productKey && displayed !== '—') ? 'Edit' : 'Set'}
                    </button>
                    {overridden && field.productKey && (
                      <button
                        onClick={() => clear(field)}
                        disabled={updateMutation.isPending}
                        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    )}
                    {overridden && !field.productKey && (
                      <button
                        onClick={() => clear(field)}
                        disabled={updateMutation.isPending}
                        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
