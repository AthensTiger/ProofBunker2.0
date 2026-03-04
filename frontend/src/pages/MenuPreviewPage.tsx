import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenuPreview } from '../hooks/useMenus';
import StarRating from '../components/ui/StarRating';
import { exportElementToPdf } from '../utils/exportPdf';
import { useUIStore } from '../stores/uiStore';

export default function MenuPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMenuPreview(id!);
  const menuRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  async function handleExportPdf() {
    if (!menuRef.current || exporting) return;
    setExporting(true);
    try {
      const filename = (data?.template.name ?? 'menu').replace(/\s+/g, '-').toLowerCase() + '.pdf';
      await exportElementToPdf(menuRef.current, filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF export failed.';
      addToast('error', msg);
      console.error('[exportPdf]', err);
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Menu not found.</p>
        <button onClick={() => navigate('/menus')} className="text-amber-700 mt-4">Back to Menus</button>
      </div>
    );
  }

  const { template, sections } = data;
  const settings = {
    columns: 2 as 1 | 2 | 3,
    show_abv: true,
    show_company: true,
    show_age: true,
    show_rating: false,
    show_description: false,
    show_tasting_notes: false,
    show_mash_bill: false,
    show_notes: false,
    show_price: false,
    show_logo: false,
    show_proof: false,
    show_batch_number: false,
    show_barrel_number: false,
    show_year_distilled: false,
    show_release_year: false,
    collapse_identical_bottles: true,
    ...template.settings,
  };
  const columns = settings.columns;
  const sectionNames = Object.keys(sections);

  // Detect nested grouping mode (group_by_location uses "loc||type||subtype" composite keys)
  const isNested = sectionNames.length > 0 && sectionNames[0].includes('||');
  const displayGroups = isNested
    ? sectionNames.map((key, i) => {
        const [loc, type, subtype] = key.split('||');
        const prev = i > 0 ? sectionNames[i - 1].split('||') : null;
        return {
          key, loc, type, subtype,
          showLoc: !prev || prev[0] !== loc,
          showType: !prev || prev[0] !== loc || prev[1] !== type,
        };
      })
    : null;

  // Shared item renderer used in both nested and flat layouts
  const renderItem = (item: any, idx: number) => (
    <div key={idx} className="menu-item break-inside-avoid">
      {/* Name + Price Row */}
      <div className="flex items-baseline gap-1">
        <span className="font-semibold text-gray-900 text-[0.85rem] leading-tight">{item.name}{item.age_statement && ` (${item.age_statement})`}</span>
        {item.quantity > 1 && (
          <span className="text-xs text-gray-400">×{item.quantity}</span>
        )}
        <span className="flex-1 border-b border-dotted border-gray-300 mx-1 translate-y-[-3px]" />
        {settings.show_price && (
          item.purchase_price != null ? (
            <span className="text-sm text-gray-700 font-medium whitespace-nowrap">${Number(item.purchase_price).toFixed(2)}</span>
          ) : item.msrp_usd != null ? (
            <span className="text-xs text-gray-400 whitespace-nowrap italic">MSRP ${Number(item.msrp_usd).toFixed(2)}</span>
          ) : null
        )}
      </div>

      {/* Details */}
      <div className="mt-0.5 text-xs text-gray-500 leading-relaxed">
        {/* Company + Rating */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {settings.show_company && item.company_name && (
            <span className="italic">{item.company_name}</span>
          )}
          {settings.show_rating && item.personal_rating && (
            <>
              {settings.show_company && item.company_name && (
                <span className="text-gray-300">|</span>
              )}
              <StarRating rating={item.personal_rating} />
            </>
          )}
        </div>

        {/* ABV */}
        {settings.show_abv && item.abv != null && (
          <p className="mt-0.5 text-gray-400">ABV: {parseFloat((Number(item.abv) * 100).toFixed(1))}%</p>
        )}

        {/* Proof */}
        {settings.show_proof && item.proof != null && (
          <p className="mt-0.5 text-gray-400">{item.proof} proof</p>
        )}

        {/* Batch / Barrel / Year Distilled / Release Year */}
        {settings.show_batch_number && item.batch_number && (
          <p className="mt-0.5 text-gray-400">Batch: {item.batch_number}</p>
        )}
        {settings.show_barrel_number && item.barrel_number && (
          <p className="mt-0.5 text-gray-400">Barrel: {item.barrel_number}</p>
        )}
        {settings.show_year_distilled && item.year_distilled != null && (
          <p className="mt-0.5 text-gray-400">Distilled: {item.year_distilled}</p>
        )}
        {settings.show_release_year && item.release_year != null && (
          <p className="mt-0.5 text-gray-400">Released: {item.release_year}</p>
        )}

        {/* Mash Bill */}
        {settings.show_mash_bill && item.mash_bill && (
          <p className="mt-0.5 text-gray-400">{item.mash_bill}</p>
        )}

        {/* Description */}
        {settings.show_description && item.description && (
          <p className="mt-1 text-gray-400 italic">{item.description}</p>
        )}

        {/* Tasting Notes — only show personal bunker notes */}
        {settings.show_tasting_notes && item.notes && (
          <p className="mt-1 text-gray-400 italic">{item.notes}</p>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => navigate(`/menus/${id}/edit`)} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
          &larr; Back to Editor
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium border border-amber-700 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {exporting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-medium bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Menu Page */}
      <div ref={menuRef} className="menu-page relative bg-white rounded-lg shadow print:shadow-none print:rounded-none">
        {/* Logo Watermark */}
        {settings.show_logo && template.print_logo_url && (
          <div className="print-watermark-container" aria-hidden="true">
            <img src={template.print_logo_url} alt="" className="print-watermark" />
          </div>
        )}
        <div className="relative z-10 px-10 py-8 print:px-0 print:py-0">

          {/* Header */}
          <div className="text-center mb-6 print:mb-4">
            <div className="flex items-center justify-center gap-4 mb-3">
              <span className="block h-px w-16 bg-amber-700/40" />
              <span className="text-amber-700 text-lg tracking-[0.3em] uppercase font-light">
                {template.subtitle || 'Spirits Selection'}
              </span>
              <span className="block h-px w-16 bg-amber-700/40" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-wide">
              {template.title || template.name}
            </h1>
            <div className="mt-3 mx-auto w-24 border-b-2 border-amber-700" />
          </div>

          {/* Sections */}
          <div className={`${
            columns === 1 ? 'max-w-2xl mx-auto' : columns === 2 ? 'columns-2 gap-10' : 'columns-3 gap-8'
          }`}>
            {isNested && displayGroups ? (
              displayGroups.map(({ key, loc, type, subtype, showLoc, showType }) => (
                <div key={key} className="mb-5">
                  {/* Location divider */}
                  {showLoc && (
                    <div className="flex items-center gap-3 mt-6 mb-4 break-after-avoid">
                      <span className="flex-1 border-t border-gray-300" />
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-[0.3em] whitespace-nowrap">{loc}</span>
                      <span className="flex-1 border-t border-gray-300" />
                    </div>
                  )}
                  {/* Spirit type header */}
                  {showType && (
                    <div className="text-center mb-3 break-after-avoid">
                      <h2 className="inline-block text-sm font-bold text-amber-800 uppercase tracking-[0.25em] border-b border-amber-700/30 pb-1">
                        {type}
                      </h2>
                    </div>
                  )}
                  {/* Spirit subtype header — only when subtype differs from type */}
                  {subtype !== type && (
                    <div className="text-center mb-2 break-after-avoid">
                      <h3 className="text-xs italic text-gray-500 tracking-wide capitalize">{subtype}</h3>
                    </div>
                  )}
                  {/* Items */}
                  <div className="space-y-3">
                    {sections[key].map(renderItem)}
                  </div>
                </div>
              ))
            ) : (
              sectionNames.map((sectionName) => (
                <div key={sectionName} className="mb-8">
                  {/* Section Header — avoid breaking away from first item */}
                  <div className="text-center mb-4 break-after-avoid">
                    <h2 className="inline-block text-sm font-bold text-amber-800 uppercase tracking-[0.25em] border-b border-amber-700/30 pb-1 capitalize">
                      {sectionName}
                    </h2>
                  </div>
                  {/* Items */}
                  <div className="space-y-3">
                    {sections[sectionName].map(renderItem)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
