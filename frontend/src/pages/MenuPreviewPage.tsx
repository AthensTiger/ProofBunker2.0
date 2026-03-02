import { useParams, useNavigate } from 'react-router-dom';
import { useMenuPreview } from '../hooks/useMenus';
import StarRating from '../components/ui/StarRating';

export default function MenuPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMenuPreview(id!);

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
    ...template.settings,
  };
  const columns = settings.columns;
  const sectionNames = Object.keys(sections);

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => navigate(`/menus/${id}/edit`)} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
          &larr; Back to Editor
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors"
        >
          Print
        </button>
      </div>

      {/* Menu Page */}
      <div className="menu-page bg-white rounded-lg shadow print:shadow-none print:rounded-none">
        <div className="px-10 py-8 print:px-0 print:py-0">

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
            {sectionNames.map((sectionName) => (
              <div key={sectionName} className="mb-8">
                {/* Section Header — avoid breaking away from first item */}
                <div className="text-center mb-4 break-after-avoid">
                  <h2 className="inline-block text-sm font-bold text-amber-800 uppercase tracking-[0.25em] border-b border-amber-700/30 pb-1 capitalize">
                    {sectionName}
                  </h2>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {sections[sectionName].map((item, idx) => (
                    <div key={idx} className="menu-item break-inside-avoid">
                      {/* Name + Price Row */}
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-gray-900 text-[0.85rem] leading-tight">{item.name}{item.age_statement && ` (${item.age_statement})`}</span>
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
                          <p className="mt-0.5 text-gray-400">ABV: {Number(item.abv).toFixed(3)}%</p>
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
