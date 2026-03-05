import { useState, useEffect } from 'react';
import type { StorageLocation } from '../../types/location';
import { formatProof, normalizeAgeStatement } from '../../utils/format';
import type { AutocompleteResult, CompanyAutocompleteResult, DistillerAutocompleteResult, ResearchResult } from '../../types/product';
import { useAutocomplete, useCompanyAutocomplete, useDistillerAutocomplete, useProductDetail, useResearchProduct } from '../../hooks/useProducts';
import { useUIStore } from '../../stores/uiStore';
import Combobox from '../ui/Combobox';
import ResearchComparisonModal from '../ui/ResearchComparisonModal';
import HelpTip from '../ui/HelpTip';

const SPIRIT_TYPES = ['whiskey', 'tequila', 'rum', 'gin', 'vodka', 'cognac', 'brandy', 'mezcal', 'liqueur', 'other'];

const SPIRIT_SUBTYPES: Record<string, string[]> = {
  whiskey: ['bourbon', 'rye', 'scotch', 'irish', 'japanese', 'canadian', 'single malt', 'blended', 'corn', 'wheat', 'tennessee', 'other'],
  tequila: ['blanco', 'reposado', 'anejo', 'extra anejo', 'cristalino', 'other'],
  mezcal: ['espadin', 'tobala', 'madrecuixe', 'arroqueno', 'ensamble', 'other'],
  rum: ['white', 'gold', 'dark', 'spiced', 'aged', 'overproof', 'agricole', 'other'],
  gin: ['london dry', 'plymouth', 'old tom', 'genever', 'new western', 'other'],
  brandy: ['cognac', 'armagnac', 'pisco', 'calvados', 'grappa', 'other'],
};

interface SubmitNewProductFormProps {
  initialUpc?: string;
  locations: StorageLocation[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function SubmitNewProductForm({ initialUpc, locations, onSubmit, onCancel, isPending }: SubmitNewProductFormProps) {
  const [name, setName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [spiritType, setSpiritType] = useState('');
  const [spiritSubtype, setSpiritSubtype] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [distillerName, setDistillerName] = useState('');
  const [description, setDescription] = useState('');
  const [proof, setProof] = useState('');
  const [abv, setAbv] = useState('');
  const [ageStatement, setAgeStatement] = useState('');
  const [isNas, setIsNas] = useState(false);
  const [volumeMl, setVolumeMl] = useState('');
  const [mashBill, setMashBill] = useState('');
  const [msrp, setMsrp] = useState('');
  const [showProduction, setShowProduction] = useState(false);
  const [barrelType, setBarrelType] = useState('');
  const [barrelCharLevel, setBarrelCharLevel] = useState('');
  const [finishType, setFinishType] = useState('');
  const [distillationMethod, setDistillationMethod] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [barrelNumber, setBarrelNumber] = useState('');
  const [bottleNumber, setBottleNumber] = useState('');
  const [showRelease, setShowRelease] = useState(false);
  const [vintageYear, setVintageYear] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [isLimitedEdition, setIsLimitedEdition] = useState(false);
  const [isDiscontinued, setIsDiscontinued] = useState(false);
  const [isSingleCask, setIsSingleCask] = useState(false);
  const [caskStrength, setCaskStrength] = useState(false);
  const [upc, setUpc] = useState(initialUpc || '');
  const [locationId, setLocationId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('pb_last_location_id');
    const savedId = saved ? Number(saved) : undefined;
    const savedExists = savedId != null && locations.some((l) => l.id === savedId);
    if (savedExists) return savedId;
    if (locations.length > 0) return locations[0].id;
    return undefined;
  });
  const [status, setStatus] = useState('sealed');
  const [price, setPrice] = useState('');

  // Autocomplete hooks
  const { data: productResults = [] } = useAutocomplete(name);
  const { data: companyResults = [] } = useCompanyAutocomplete(companyName);
  const { data: distillerResults = [] } = useDistillerAutocomplete(distillerName);
  const { data: productDetail } = useProductDetail(selectedProductId);

  // Research hook
  const addToast = useUIStore((s) => s.addToast);
  const research = useResearchProduct();
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

  const handleApplyResearch = (selected: Partial<ResearchResult>) => {
    if (selected.name != null) setName(String(selected.name));
    if (selected.spirit_type != null) setSpiritType(String(selected.spirit_type));
    if (selected.spirit_subtype != null) setSpiritSubtype(String(selected.spirit_subtype));
    if (selected.company_name != null) setCompanyName(String(selected.company_name));
    if (selected.distiller_name != null) setDistillerName(String(selected.distiller_name));
    if (selected.description != null) setDescription(String(selected.description));
    if (selected.proof != null) setProof(String(selected.proof));
    if (selected.abv != null) setAbv(String(parseFloat((Number(selected.abv) * 100).toFixed(3))));
    if (selected.age_statement != null) {
      const age = String(selected.age_statement);
      setAgeStatement(age);
      setIsNas(age.toUpperCase() === 'NAS');
    }
    if (selected.volume_ml != null) setVolumeMl(String(selected.volume_ml));
    if (selected.mash_bill != null) setMashBill(String(selected.mash_bill));
    if (selected.msrp_usd != null) setMsrp(String(selected.msrp_usd));
    if (selected.barrel_type != null) { setBarrelType(String(selected.barrel_type)); setShowProduction(true); }
    if (selected.finish_type != null) { setFinishType(String(selected.finish_type)); setShowProduction(true); }
    if (selected.upc != null) setUpc(String(selected.upc));
    setResearchResult(null);
    addToast('success', 'Research data applied');
  };

  // Auto-fill when product detail loads
  useEffect(() => {
    if (!productDetail) return;
    const p = productDetail;
    setSpiritType(p.spirit_type || '');
    setSpiritSubtype(p.spirit_subtype || '');
    setCompanyName(p.company_name || '');
    setDistillerName(p.distiller_name || '');
    setDescription(p.description || '');
    setProof(p.proof != null ? formatProof(p.proof) : '');
    setAbv(p.abv != null ? String(parseFloat((Number(p.abv) * 100).toFixed(3))) : '');
    const age = p.age_statement || '';
    setAgeStatement(age);
    setIsNas(age.toUpperCase() === 'NAS');
    setVolumeMl(p.volume_ml != null ? String(p.volume_ml) : '');
    setMashBill(p.mash_bill || '');
    setMsrp(p.msrp_usd != null ? String(p.msrp_usd) : '');
    setBarrelType(p.barrel_type || '');
    setBarrelCharLevel(p.barrel_char_level || '');
    setFinishType(p.finish_type || '');
    if (p.barrel_type || p.barrel_char_level || p.finish_type) setShowProduction(true);
  }, [productDetail]);

  const clearSelection = () => {
    setSelectedProductId(null);
    setName('');
    setSpiritType('');
    setSpiritSubtype('');
    setCompanyName('');
    setDistillerName('');
    setDescription('');
    setProof('');
    setAbv('');
    setAgeStatement('');
    setIsNas(false);
    setVolumeMl('');
    setMashBill('');
    setMsrp('');
    setBarrelType('');
    setBarrelCharLevel('');
    setFinishType('');
    setDistillationMethod('');
    setBatchNumber('');
    setBarrelNumber('');
    setBottleNumber('');
    setVintageYear('');
    setReleaseYear('');
    setIsLimitedEdition(false);
    setIsDiscontinued(false);
    setIsSingleCask(false);
    setCaskStrength(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductId) {
      // Existing product — add to bunker
      onSubmit({
        product_id: selectedProductId,
        storage_location_id: locationId,
        status,
        purchase_price: price ? parseFloat(price) : undefined,
        bottle_number: bottleNumber.trim() || undefined,
      });
      return;
    }
    if (!name.trim() || !spiritType) return;
    onSubmit({
      name: name.trim(),
      spirit_type: spiritType,
      spirit_subtype: spiritSubtype || undefined,
      company_name: companyName.trim() || undefined,
      distiller_name: distillerName.trim() || undefined,
      description: description.trim() || undefined,
      proof: proof ? parseFloat(proof) : undefined,
      abv: abv ? parseFloat(abv) / 100 : undefined,
      age_statement: isNas ? 'NAS' : normalizeAgeStatement(ageStatement) || undefined,
      volume_ml: volumeMl ? parseInt(volumeMl) : undefined,
      mash_bill: mashBill.trim() || undefined,
      msrp_usd: msrp ? parseFloat(msrp) : undefined,
      barrel_type: barrelType.trim() || undefined,
      barrel_char_level: barrelCharLevel.trim() || undefined,
      finish_type: finishType.trim() || undefined,
      distillation_method: distillationMethod.trim() || undefined,
      batch_number: batchNumber.trim() || undefined,
      barrel_number: barrelNumber.trim() || undefined,
      vintage_year: vintageYear ? parseInt(vintageYear) : undefined,
      release_year: releaseYear ? parseInt(releaseYear) : undefined,
      is_limited_edition: isLimitedEdition || undefined,
      is_discontinued: isDiscontinued || undefined,
      is_single_cask: isSingleCask || undefined,
      cask_strength: caskStrength || undefined,
      upc: upc.trim() || undefined,
      bottle_number: bottleNumber.trim() || undefined,
      storage_location_id: locationId,
      status,
      purchase_price: price ? parseFloat(price) : undefined,
    });
  };

  const subtypes = SPIRIT_SUBTYPES[spiritType] || [];
  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {selectedProductId ? 'Add Existing Product to Bunker' : 'Submit New Product'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {selectedProductId
          ? 'This product already exists. It will be added directly to your bunker.'
          : 'This product will be added to your bunker immediately and submitted for community review.'}
      </p>

      {selectedProductId && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <span className="text-sm font-medium text-amber-800">Existing product selected: {name}</span>
          <button type="button" onClick={clearSelection} className="text-xs text-amber-700 hover:text-amber-900 font-medium">
            Clear
          </button>
        </div>
      )}

      {/* Basic Info */}
      <fieldset className="mb-5">
        <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Basic Info</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Combobox<AutocompleteResult>
              label="Product Name *"
              value={name}
              onChange={(v) => { setName(v); if (selectedProductId) setSelectedProductId(null); }}
              onSelect={(p) => { setName(p.name); setSelectedProductId(p.id); }}
              results={selectedProductId ? [] : productResults}
              renderItem={(p) => (
                <div className="flex items-center gap-2">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover object-right flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.company_name && `${p.company_name} · `}<span className="capitalize">{p.spirit_type}</span></p>
                  </div>
                </div>
              )}
              getItemLabel={(p) => p.name}
              placeholder="Start typing a product name..."
              required
            />
            {!selectedProductId && (
              <button
                type="button"
                onClick={handleResearch}
                disabled={!name.trim() || research.isPending}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {research.isPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Researching...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    Research Product
                  </>
                )}
              </button>
            )}
          </div>

          {!selectedProductId && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spirit Type * <HelpTip text="The primary category of spirit (e.g., Whiskey, Tequila, Rum). Required." /></label>
                <select value={spiritType} onChange={(e) => { setSpiritType(e.target.value); setSpiritSubtype(''); }}
                  required className={`${inputCls} bg-white`}>
                  <option value="">Select type...</option>
                  {SPIRIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              {subtypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtype <HelpTip text="More specific style within the category (e.g., Bourbon, Single Malt, Reposado)." /></label>
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
                placeholder="e.g., Buffalo Trace Distillery"
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
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description, tasting notes, etc." rows={2} className={`${inputCls} resize-y`} />
              </div>
            </>
          )}
        </div>
      </fieldset>

      {/* Specifications — only for new products */}
      {!selectedProductId && (
        <fieldset className="mb-5">
          <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Specifications</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proof <HelpTip text="Alcohol strength = ABV × 2. A 45% ABV spirit is 90 proof. Enter one and the other auto-calculates." /></label>
              <input type="number" step="any" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="e.g., 90" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ABV (%) <HelpTip text="Alcohol by volume as a percentage (e.g., 45.0 for a 45% spirit). Enter either Proof or ABV — the other will auto-fill." /></label>
              <input type="number" step="any" value={abv} onChange={(e) => setAbv(e.target.value)} placeholder="e.g., 45.0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age Statement (Years) <HelpTip text='Years aged as stated on the label (e.g., "12"). Check NAS if no age statement.' /></label>
              <div className="flex items-center gap-2">
                <input type="text" value={isNas ? '' : ageStatement} onChange={(e) => setAgeStatement(e.target.value)} placeholder={isNas ? 'NAS' : 'e.g., 12'} disabled={isNas} className={`${inputCls} ${isNas ? 'bg-gray-100 text-gray-400' : ''}`} />
                <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={isNas} onChange={(e) => { setIsNas(e.target.checked); if (e.target.checked) setAgeStatement(''); }} className="rounded border-gray-300 text-amber-700 focus:ring-amber-500" />
                  NAS
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volume (ml) <HelpTip text="Bottle size in milliliters. Common sizes: 50ml (mini), 375ml (half), 750ml (standard), 1000ml, 1750ml (handle)." /></label>
              <input type="number" value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} placeholder="e.g., 750" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mash Bill <HelpTip text="The grain recipe used in fermentation (e.g., 75% corn, 21% rye, 4% malted barley). Required for bourbon and rye." /></label>
              <input type="text" value={mashBill} onChange={(e) => setMashBill(e.target.value)} placeholder="e.g., 75% corn, 13% rye" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MSRP ($) <HelpTip text="Manufacturer's Suggested Retail Price in USD. Enter the standard retail price, not sale or secondary market prices." /></label>
              <input type="number" step="0.01" min="0" value={msrp} onChange={(e) => setMsrp(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
          </div>
        </fieldset>
      )}

      {/* Production Details (collapsible) — only for new products */}
      {!selectedProductId && (
        <fieldset className="mb-5">
          <button type="button" onClick={() => setShowProduction(!showProduction)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            <span className={`transition-transform ${showProduction ? 'rotate-90' : ''}`}>&#9654;</span>
            Production Details
          </button>
          {showProduction && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Type <HelpTip text="The type of cask used for primary aging (e.g., New Charred Oak, Ex-Bourbon, Sherry Butt, Virgin Oak)." /></label>
                <input type="text" value={barrelType} onChange={(e) => setBarrelType(e.target.value)} placeholder="e.g., New charred oak" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Char Level <HelpTip text="How deeply the inside of the oak barrel was charred before filling. #1 (light) to #4 (alligator char) is most common for bourbon." /></label>
                <input type="text" value={barrelCharLevel} onChange={(e) => setBarrelCharLevel(e.target.value)} placeholder="e.g., #4 Char" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finish Type <HelpTip text="A secondary cask used to add final flavor (e.g., Port, Sherry, Wine, Rum, Madeira). Leave blank if no finish." /></label>
                <input type="text" value={finishType} onChange={(e) => setFinishType(e.target.value)} placeholder="e.g., Port Cask Finish" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distillation Method <HelpTip text="Equipment used to distill the spirit (e.g., Pot Still, Column Still, Double Pot). Pot stills produce heavier, more complex spirits." /></label>
                <input type="text" value={distillationMethod} onChange={(e) => setDistillationMethod(e.target.value)} placeholder="e.g., Pot Still" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g., B23-001" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barrel Number</label>
                <input type="text" value={barrelNumber} onChange={(e) => setBarrelNumber(e.target.value)} placeholder="e.g., 4521" className={inputCls} />
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* Release Info (collapsible) — only for new products */}
      {!selectedProductId && (
        <fieldset className="mb-5">
          <button type="button" onClick={() => setShowRelease(!showRelease)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            <span className={`transition-transform ${showRelease ? 'rotate-90' : ''}`}>&#9654;</span>
            Release Info
          </button>
          {showRelease && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vintage Year</label>
                <input type="number" value={vintageYear} onChange={(e) => setVintageYear(e.target.value)} placeholder="e.g., 2015" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Release Year</label>
                <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="e.g., 2023" className={inputCls} />
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
          )}
        </fieldset>
      )}

      {/* Bottle Details */}
      <fieldset className="mb-5">
        <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Bottle Details</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bottle #</label>
            <input type="text" value={bottleNumber} onChange={(e) => setBottleNumber(e.target.value)} placeholder="e.g., 245/500" className={inputCls} />
          </div>
          {!selectedProductId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPC Barcode</label>
              <input type="text" value={upc} onChange={(e) => setUpc(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter barcode" maxLength={14} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select value={locationId ?? ''} onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              setLocationId(val);
              if (val != null) localStorage.setItem('pb_last_location_id', String(val));
              else localStorage.removeItem('pb_last_location_id');
            }} className={`${inputCls} bg-white`}>
              {locations.length === 0 && <option value="">No location</option>}
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="flex gap-2">
              {(['sealed', 'opened', 'empty'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                    status === s ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending || (!selectedProductId && (!name.trim() || !spiritType))}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50">
          {isPending ? 'Submitting...' : selectedProductId ? 'Add to Bunker' : 'Submit & Add to Bunker'}
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
          onApply={(selected) => handleApplyResearch(selected)}
          onClose={() => setResearchResult(null)}
        />
      )}
    </form>
  );
}
