import { useState, useEffect } from 'react';
import { useAdminCompany, useUpdateCompany } from '../../hooks/useAdmin';
import { useCompanyAutocomplete } from '../../hooks/useProducts';
import { useUIStore } from '../../stores/uiStore';
import Combobox from '../ui/Combobox';
import type { CompanyAutocompleteResult } from '../../types/product';

interface CompanyEditModalProps {
  companyId: number;
  onClose: () => void;
}

export default function CompanyEditModal({ companyId, onClose }: CompanyEditModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { data: company, isLoading } = useAdminCompany(companyId);
  const updateMutation = useUpdateCompany();

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [parentCompanyName, setParentCompanyName] = useState('');
  const [parentCompanyId, setParentCompanyId] = useState<number | null>(null);

  const { data: parentResults = [] } = useCompanyAutocomplete(parentCompanyName);

  useEffect(() => {
    if (!company) return;
    setName(company.name || '');
    setWebsite(company.website || '');
    setCountry(company.country || '');
    setDescription(company.description || '');
    setIsVerified(company.is_verified || false);
    setParentCompanyName(company.parent_company_name || '');
    setParentCompanyId(company.parent_company_id || null);
  }, [company]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        id: companyId,
        name: name.trim(),
        website: website.trim() || null,
        country: country.trim() || null,
        description: description.trim() || null,
        is_verified: isVerified,
        parent_company_id: parentCompanyId,
      } as any,
      {
        onSuccess: () => { addToast('success', 'Company updated'); onClose(); },
        onError: () => addToast('error', 'Failed to update company'),
      }
    );
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Company</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
            </div>
            <Combobox<CompanyAutocompleteResult>
              label="Parent Company"
              value={parentCompanyName}
              onChange={(v) => { setParentCompanyName(v); if (!v) setParentCompanyId(null); }}
              onSelect={(c) => { setParentCompanyName(c.name); setParentCompanyId(c.id); }}
              results={parentResults.filter((c) => c.id !== companyId)}
              renderItem={(c) => <span className="font-medium">{c.name}</span>}
              getItemLabel={(c) => c.name}
              placeholder="Search parent company..."
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} resize-y`} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="rounded border-gray-300 text-amber-700 focus:ring-amber-500" />
              Verified
            </label>
            {company && (
              <p className="text-xs text-gray-400">{company.product_count} product{company.product_count !== 1 ? 's' : ''} linked</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
