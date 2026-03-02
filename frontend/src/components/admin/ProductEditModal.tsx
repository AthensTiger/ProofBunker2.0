import { useState, useEffect } from 'react';
import { useAdminUpdateProduct, useAdminProduct, useUploadProductImageFromUrl } from '../../hooks/useAdmin';
import { useCompanyAutocomplete, useDistillerAutocomplete, useResearchProduct } from '../../hooks/useProducts';
import { useUIStore } from '../../stores/uiStore';
import Combobox from '../ui/Combobox';
import ResearchComparisonModal from '../ui/ResearchComparisonModal';
import ProductPhotoUpload from './ProductPhotoUpload';
import type { CompanyAutocompleteResult, DistillerAutocompleteResult, ResearchResult } from '../../types/product';

const SPIRIT_TYPES = ['whiskey', 'tequila', 'rum', 'gin', 'vodka', 'cognac', 'brandy', 'mezcal', 'liqueur', 'other'];
const SPIRIT_SUBTYPES: Record<string, string[]> = {
  whiskey: ['bourbon', 'rye', 'scotch', 'irish', 'japanese', 'canadian', 'single malt', 'blended', 'corn', 'wheat', 'tennessee', 'other'],
  tequila: ['blanco', 'reposado', 'anejo', 'extra anejo', 'cristalino', 'other'],
  mezcal: ['espadin', 'tobala', 'madrecuixe', 'arroqueno', 'ensamble', 'other'],
  rum: ['white', 'gold', 'dark', 'spiced', 'aged', 'overproof', 'agricole', 'other'],
  gin: ['london dry', 'plymouth', 'old tom', 'genever', 'new western', 'other'],
  brandy: ['cognac', 'armagnac', 'pisco', 'calvados', 'grappa', 'other'],
};

interface ProductEditModalProps {
  productId: number;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ProductEditModal({ productId, onClose, onSaved }: ProductEditModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { data: product, isLoading } = useAdminProduct(productId);
  const updateMutation = useAdminUpdateProduct();

  const [name, setName] = useState('');
  const [spiritType, setSpiritType] = useState('');
  const [spiritSubtype, setSpiritSubtype] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [distillerName, setDistillerName] = useState('');
  const [description, setDescription] = useState('');
  const [proof, setProof] = useState('');
  const [abv, setAbv] = useState('');
  const [ageStatement, setAgeStatement] = useState('');
  const [volumeMl, setVolumeMl] = useState('');
  const [mashBill, setMashBill] = useState('');
  const [msrp, setMsrp] = useState('');
  const [barrelType, setBarrelType] = useState('');
  const [barrelCharLevel, setBarrelCharLevel] = useState('');
  const [finishType, setFinishType] = useState('');
  const [distillationMethod, setDistillationMethod] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [barrelNumber, setBarrelNumber] = useState('');
  const [vintageYear, setVintageYear] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [isLimitedEdition, setIsLimitedEdition] = useState(false);
  const [isDiscontinued, setIsDiscontinued] = useState(false);
  const [isSingleCask, setIsSingleCask] = useState(false);
  const [caskStrength, setCaskStrength] = useState(false);
  const [upc, setUpc] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');

  const { data: companyResults = [] } = useCompanyAutocomplete(companyName);
  const { data: distillerResults = [] } = useDistillerAutocomplete(distillerName);

  // Research hook
  const research = useResearchProduct();
  const uploadImageFromUrl = useUploadProductImageFromUrl();
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);

  const handleResearch = () => {
    if (!name.trim()) return;
    research.mutate(name.trim(), {
      onSuccess: (data: ResearchResult) => setResearchResult(data),
      onError: (err: any) => {
        addToast('error', err?.message || 'Research failed. Please try again.');
      },
    });
  };

  const handleApplyResearch = (selected: Partial<ResearchResult>, selectedImageUrls: string[]) => {
    if (selected.name != null) setName(String(selected.name));
    if (selected.spirit_type != null) setSpiritType(String(selected.spirit_type));
    if (selected.spirit_subtype != null) setSpiritSubtype(String(selected.spirit_subtype));
    if (selected.company_name != null) setCompanyName(String(selected.company_name));
    if (selected.distiller_name != null) setDistillerName(String(selected.distiller_name));
    if (selected.description != null) setDescription(String(selected.description));
    if (selected.proof != null) setProof(String(selected.proof));
    if (selected.abv != null) setAbv(String(selected.abv));
    if (selected.age_statement != null) setAgeStatement(String(selected.age_statement));
    if (selected.volume_ml != null) setVolumeMl(String(selected.volume_ml));
    if (selected.mash_bill != null) setMashBill(String(selected.mash_bill));
    if (selected.msrp_usd != null) setMsrp(String(selected.msrp_usd));
    if (selected.barrel_type != null) setBarrelType(String(selected.barrel_type));
    if (selected.finish_type != null) setFinishType(String(selected.finish_type));
    if (selected.upc != null) setUpc(String(selected.upc));
    // Import selected images
    for (const url of selectedImageUrls) {
      uploadImageFromUrl.mutate(
        { productId, url },
        { onError: () => addToast('error', 'Failed to import an image') }
      );
    }
    setResearchResult(null);
    addToast('success', 'Research data applied');
  };

  useEffect(() => {
    if (!product) return;
    setName(product.name || '');
    setSpiritType(product.spirit_type || '');
    setSpiritSubtype(product.spirit_subtype || '');
    setCompanyName(product.company_name || '');
    setDistillerName(product.distiller_name || '');
    setDescription(product.description || '');
    setProof(product.proof != null ? String(product.proof) : '');
    setAbv(product.abv != null ? String(product.abv) : '');
    setAgeStatement(product.age_statement || '');
    setVolumeMl(product.volume_ml != null ? String(product.volume_ml) : '');
    setMashBill(product.mash_bill || '');
    setMsrp(product.msrp_usd != null ? String(product.msrp_usd) : '');
    setBarrelType(product.barrel_type || '');
    setBarrelCharLevel(product.barrel_char_level || '');
    setFinishType(product.finish_type || '');
    setDistillationMethod(product.distillation_method || '');
    setBatchNumber(product.batch_number || '');
    setBarrelNumber(product.barrel_number || '');
    setVintageYear(product.vintage_year != null ? String(product.vintage_year) : '');
    setReleaseYear(product.release_year != null ? String(product.release_year) : '');
    setIsLimitedEdition(product.is_limited_edition || false);
    setIsDiscontinued(product.is_discontinued || false);
    setIsSingleCask(product.is_single_cask || false);
    setCaskStrength(product.cask_strength || false);
    const canonicalUpc = product.upcs?.find((u: any) => u.is_canonical)?.upc || product.upcs?.[0]?.upc || '';
    setUpc(canonicalUpc);
    setApprovalStatus(product.approval_status || 'pending');
  }, [product]);

  const handleSave = (newStatus?: string) => {
    const body: Record<string, unknown> = {
      id: productId,
      name: name.trim(),
      spirit_type: spiritType,
      spirit_subtype: spiritSubtype || null,
      company_name: companyName.trim() || null,
      distiller_name: distillerName.trim() || null,
      description: description.trim() || null,
      proof: proof ? parseFloat(proof) : null,
      abv: abv ? parseFloat(abv) : null,
      age_statement: ageStatement.trim() || null,
      volume_ml: volumeMl ? parseInt(volumeMl) : null,
      mash_bill: mashBill.trim() || null,
      msrp_usd: msrp ? parseFloat(msrp) : null,
      barrel_type: barrelType.trim() || null,
      barrel_char_level: barrelCharLevel.trim() || null,
      finish_type: finishType.trim() || null,
      distillation_method: distillationMethod.trim() || null,
      batch_number: batchNumber.trim() || null,
      barrel_number: barrelNumber.trim() || null,
      vintage_year: vintageYear ? parseInt(vintageYear) : null,
      release_year: releaseYear ? parseInt(releaseYear) : null,
      is_limited_edition: isLimitedEdition,
      is_discontinued: isDiscontinued,
      is_single_cask: isSingleCask,
      cask_strength: caskStrength,
      upc: upc.trim() || null,
    };

    if (newStatus) body.approval_status = newStatus;
    else body.approval_status = approvalStatus;

    updateMutation.mutate(body as any, {
      onSuccess: () => {
        addToast('success', 'Product updated');
        onSaved?.();
        onClose();
      },
      onError: () => addToast('error', 'Failed to update product'),
    });
  };

  const subtypes = SPIRIT_SUBTYPES[spiritType] || [];
  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Edit Product</h2>
            <button
              type="button"
              onClick={handleResearch}
              disabled={!name.trim() || research.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {research.isPending ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Researching...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                  Research
                </>
              )}
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Basic Info */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Basic Info</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spirit Type *</label>
                  <select value={spiritType} onChange={(e) => { setSpiritType(e.target.value); setSpiritSubtype(''); }} required className={`${inputCls} bg-white`}>
                    <option value="">Select type...</option>
                    {SPIRIT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {subtypes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtype</label>
                    <select value={spiritSubtype} onChange={(e) => setSpiritSubtype(e.target.value)} className={`${inputCls} bg-white`}>
                      <option value="">Select subtype...</option>
                      {subtypes.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                )}
                <Combobox<CompanyAutocompleteResult>
                  label="Company / Brand"
                  value={companyName}
                  onChange={setCompanyName}
                  onSelect={(c) => setCompanyName(c.name)}
                  results={companyResults}
                  renderItem={(c) => (
                    <div>
                      <span className="font-medium">{c.name}</span>
                      {c.country && <span className="text-xs text-gray-500 ml-1">({c.country})</span>}
                    </div>
                  )}
                  getItemLabel={(c) => c.name}
                  placeholder="e.g., Buffalo Trace"
                />
                <Combobox<DistillerAutocompleteResult>
                  label="Distiller"
                  value={distillerName}
                  onChange={setDistillerName}
                  onSelect={(d) => setDistillerName(d.name)}
                  results={distillerResults}
                  renderItem={(d) => (
                    <div>
                      <span className="font-medium">{d.name}</span>
                      {(d.region || d.country) && <span className="text-xs text-gray-500 ml-1">({[d.region, d.country].filter(Boolean).join(', ')})</span>}
                    </div>
                  )}
                  getItemLabel={(d) => d.name}
                  placeholder="e.g., Buffalo Trace Distillery"
                />
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-y`} />
                </div>
              </div>
            </fieldset>

            {/* Specifications */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Specifications</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proof</label>
                  <input type="number" step="0.1" value={proof} onChange={(e) => setProof(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ABV (%)</label>
                  <input type="number" step="0.001" value={abv} onChange={(e) => setAbv(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age Statement</label>
                  <input type="text" value={ageStatement} onChange={(e) => setAgeStatement(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (ml)</label>
                  <input type="number" value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mash Bill</label>
                  <input type="text" value={mashBill} onChange={(e) => setMashBill(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MSRP ($)</label>
                  <input type="number" step="0.01" min="0" value={msrp} onChange={(e) => setMsrp(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPC Barcode</label>
                  <input type="text" value={upc} onChange={(e) => setUpc(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Enter barcode" maxLength={14} className={inputCls} />
                </div>
              </div>
            </fieldset>

            {/* Production Details */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Production Details</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Type</label>
                  <input type="text" value={barrelType} onChange={(e) => setBarrelType(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Char Level</label>
                  <input type="text" value={barrelCharLevel} onChange={(e) => setBarrelCharLevel(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Finish Type</label>
                  <input type="text" value={finishType} onChange={(e) => setFinishType(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distillation Method</label>
                  <input type="text" value={distillationMethod} onChange={(e) => setDistillationMethod(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Number</label>
                  <input type="text" value={barrelNumber} onChange={(e) => setBarrelNumber(e.target.value)} className={inputCls} />
                </div>
              </div>
            </fieldset>

            {/* Release Info */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Release Info</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vintage Year</label>
                  <input type="number" value={vintageYear} onChange={(e) => setVintageYear(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Release Year</label>
                  <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={isLimitedEdition} onChange={(e) => setIsLimitedEdition(e.target.checked)} className="rounded border-gray-300 text-amber-700 focus:ring-amber-500" />
                    Limited Edition
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={isDiscontinued} onChange={(e) => setIsDiscontinued(e.target.checked)} className="rounded border-gray-300 text-amber-700 focus:ring-amber-500" />
                    Discontinued
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={isSingleCask} onChange={(e) => setIsSingleCask(e.target.checked)} className="rounded border-gray-300 text-amber-700 focus:ring-amber-500" />
                    Single Cask
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={caskStrength} onChange={(e) => setCaskStrength(e.target.checked)} className="rounded border-gray-300 text-amber-700 focus:ring-amber-500" />
                    Cask Strength
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Status */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Approval Status</legend>
              <div className="flex gap-2">
                {(['pending', 'approved', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setApprovalStatus(s)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                      approvalStatus === s
                        ? s === 'approved' ? 'bg-green-600 text-white'
                          : s === 'rejected' ? 'bg-red-600 text-white'
                          : 'bg-amber-700 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Product Images */}
            {product && (
              <ProductPhotoUpload productId={productId} images={product.images || []} />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          {product?.approval_status === 'pending' && (
            <button
              onClick={() => handleSave('approved')}
              disabled={updateMutation.isPending || !name.trim() || !spiritType}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Save & Approve
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={updateMutation.isPending || !name.trim() || !spiritType}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>

        {researchResult && (
          <ResearchComparisonModal
            result={researchResult}
            currentValues={{
              name, spirit_type: spiritType, spirit_subtype: spiritSubtype,
              company_name: companyName, distiller_name: distillerName, description,
              proof: proof || null, abv: abv || null, age_statement: ageStatement,
              volume_ml: volumeMl || null, mash_bill: mashBill, msrp_usd: msrp || null,
              barrel_type: barrelType, finish_type: finishType, upc,
            }}
            onApply={handleApplyResearch}
            onClose={() => setResearchResult(null)}
          />
        )}
      </div>
    </div>
  );
}
