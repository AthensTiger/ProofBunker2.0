import { useState } from 'react';
import { formatProof, formatAgeStatement } from '../../utils/format';

interface FieldDef {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Product Name' },
  { key: 'spirit_type', label: 'Spirit Type' },
  { key: 'spirit_subtype', label: 'Subtype' },
  { key: 'company_name', label: 'Company / Brand' },
  { key: 'distiller_name', label: 'Distiller' },
  { key: 'proof', label: 'Proof', format: (v) => formatProof(Number(v)) },
  { key: 'abv', label: 'ABV', format: (v) => `${(Number(v) * 100).toFixed(1)}%` },
  { key: 'age_statement', label: 'Age Statement', format: (v) => formatAgeStatement(String(v)) },
  { key: 'mash_bill', label: 'Mash Bill' },
  { key: 'barrel_type', label: 'Barrel Type' },
  { key: 'finish_type', label: 'Finish Type' },
  { key: 'volume_ml', label: 'Volume (ml)' },
  { key: 'description', label: 'Description' },
];

interface LabelVerificationModalProps {
  scannedData: Record<string, unknown>;
  currentData: Record<string, unknown>;
  onConfirm: (acceptedData: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function LabelVerificationModal({
  scannedData,
  currentData,
  onConfirm,
  onClose,
}: LabelVerificationModalProps) {
  // For each field, track whether the user wants to use the scanned value
  const [selections, setSelections] = useState<Record<string, 'scanned' | 'current'>>(() => {
    const init: Record<string, 'scanned' | 'current'> = {};
    for (const f of FIELDS) {
      const scanned = scannedData[f.key];
      const current = currentData[f.key];
      // Default to scanned if it's a new value or different from current
      if (scanned != null && scanned !== '' && scanned !== current) {
        init[f.key] = 'scanned';
      } else {
        init[f.key] = 'current';
      }
    }
    return init;
  });

  const confidence = scannedData.confidence as number;
  const notes = scannedData.notes as string;

  const changedFields = FIELDS.filter((f) => {
    const scanned = scannedData[f.key];
    const current = currentData[f.key];
    return scanned != null && scanned !== '' && scanned !== current;
  });

  const handleConfirm = () => {
    const accepted: Record<string, unknown> = {};
    for (const f of FIELDS) {
      if (selections[f.key] === 'scanned' && scannedData[f.key] != null) {
        accepted[f.key] = scannedData[f.key];
      }
    }
    onConfirm(accepted);
  };

  const formatValue = (field: FieldDef, value: unknown): string => {
    if (value == null || value === '') return '—';
    if (field.format) return field.format(value);
    return String(value);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Verify Label Data</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {confidence != null && (
                <span className={`font-medium ${confidence >= 0.8 ? 'text-green-700' : confidence >= 0.5 ? 'text-amber-700' : 'text-red-600'}`}>
                  {(confidence * 100).toFixed(0)}% confidence
                </span>
              )}
              {changedFields.length > 0 && (
                <span> &middot; {changedFields.length} difference{changedFields.length !== 1 ? 's' : ''} found</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {notes && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <span className="font-medium">AI Notes:</span> {notes}
            </div>
          )}

          {changedFields.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600">Label data matches the current product data. No changes needed.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-3">Field</th>
                  <th className="pb-2 pr-3">Current</th>
                  <th className="pb-2 pr-3">From Label</th>
                  <th className="pb-2 w-20">Use</th>
                </tr>
              </thead>
              <tbody>
                {changedFields.map((f) => (
                  <tr key={f.key} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-500 font-medium whitespace-nowrap">{f.label}</td>
                    <td className={`py-2 pr-3 ${selections[f.key] === 'current' ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {formatValue(f, currentData[f.key])}
                    </td>
                    <td className={`py-2 pr-3 ${selections[f.key] === 'scanned' ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                      {formatValue(f, scannedData[f.key])}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSelections((s) => ({ ...s, [f.key]: 'current' }))}
                          className={`px-2 py-0.5 text-xs rounded ${
                            selections[f.key] === 'current'
                              ? 'bg-gray-200 text-gray-800 font-medium'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          Keep
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelections((s) => ({ ...s, [f.key]: 'scanned' }))}
                          className={`px-2 py-0.5 text-xs rounded ${
                            selections[f.key] === 'scanned'
                              ? 'bg-green-100 text-green-800 font-medium'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors"
            >
              {changedFields.length > 0
                ? `Confirm & Update (${Object.values(selections).filter((s) => s === 'scanned').length} field${Object.values(selections).filter((s) => s === 'scanned').length !== 1 ? 's' : ''})`
                : 'Confirm Label Verified'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
