import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenuTemplate, useUpdateMenuTemplate, useSetMenuItems } from '../hooks/useMenus';
import { useBunkerList } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useUIStore } from '../stores/uiStore';
import type { MenuSettings } from '../types/menu';

export default function MenuEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const { data: template, isLoading } = useMenuTemplate(id!);
  const { data: bunkerItems = [] } = useBunkerList({});
  const { data: locations = [] } = useLocations();
  const updateMutation = useUpdateMenuTemplate();
  const setItemsMutation = useSetMenuItems();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [settings, setSettings] = useState<MenuSettings>({
    columns: 2,
    show_abv: true,
    show_company: true,
    show_age: true,
    show_rating: false,
    show_description: false,
    show_tasting_notes: false,
    show_mash_bill: false,
    show_notes: false,
    show_price: false,
  });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterLocations, setFilterLocations] = useState<Set<string>>(new Set());
  const [filterSpiritTypes, setFilterSpiritTypes] = useState<Set<string>>(new Set());

  const distinctSpiritTypes = useMemo(() => {
    const types = new Set<string>();
    bunkerItems.forEach((item) => {
      const label = item.spirit_subtype || item.spirit_type;
      if (label) types.add(label);
    });
    return Array.from(types).sort();
  }, [bunkerItems]);

  const filteredBunkerItems = useMemo(() => {
    return bunkerItems.filter((item) => {
      if (filterStatuses.size > 0) {
        const hasMatchingStatus = item.statuses.some((s) => filterStatuses.has(s));
        if (!hasMatchingStatus) return false;
      }
      if (filterLocations.size > 0) {
        const hasMatchingLocation = item.location_names.some((l) => filterLocations.has(l));
        if (!hasMatchingLocation) return false;
      }
      if (filterSpiritTypes.size > 0) {
        const label = item.spirit_subtype || item.spirit_type;
        if (!label || !filterSpiritTypes.has(label)) return false;
      }
      return true;
    });
  }, [bunkerItems, filterStatuses, filterLocations, filterSpiritTypes]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setTitle(template.title || '');
      setSubtitle(template.subtitle || '');
      setSettings({ ...settings, ...template.settings });
      setSelectedItems(new Set(template.items.map((i) => i.bunker_item_id)));
      // Restore saved filter rules
      if (template.settings.filter_statuses?.length) setFilterStatuses(new Set(template.settings.filter_statuses));
      if (template.settings.filter_locations?.length) setFilterLocations(new Set(template.settings.filter_locations));
      if (template.settings.filter_spirit_types?.length) setFilterSpiritTypes(new Set(template.settings.filter_spirit_types));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const handleSave = () => {
    const templateId = parseInt(id!);
    const items = Array.from(selectedItems).map((bunkerItemId, idx) => ({
      bunker_item_id: bunkerItemId,
      display_order: idx,
    }));

    // Persist filter rules into settings so the backend can apply them at preview time
    const settingsWithFilters = {
      ...settings,
      filter_statuses: filterStatuses.size > 0 ? Array.from(filterStatuses) : undefined,
      filter_locations: filterLocations.size > 0 ? Array.from(filterLocations) : undefined,
      filter_spirit_types: filterSpiritTypes.size > 0 ? Array.from(filterSpiritTypes) : undefined,
    };

    Promise.all([
      updateMutation.mutateAsync({
        id: templateId,
        name: name.trim(),
        title: title.trim() || undefined,
        subtitle: subtitle.trim() || undefined,
        settings: settingsWithFilters,
      }),
      setItemsMutation.mutateAsync({ id: templateId, items }),
    ]).then(() => {
      addToast('success', 'Template saved');
    }).catch(() => {
      addToast('error', 'Failed to save template');
    });
  };

  const toggleItem = (bunkerItemId: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(bunkerItemId)) next.delete(bunkerItemId);
      else next.add(bunkerItemId);
      return next;
    });
  };

  const toggleSetting = (key: keyof MenuSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Template not found.</p>
        <button onClick={() => navigate('/menus')} className="text-amber-700 mt-4">Back to Menus</button>
      </div>
    );
  }

  const isSaving = updateMutation.isPending || setItemsMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/menus')} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
          &larr; Back to Menus
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/menus/${id}/preview`)}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Template Settings</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., The Proof Bunker"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g., Premium Spirits Selection"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSettings((s) => ({ ...s, columns: n as 1 | 2 | 3 }))}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                        settings.columns === n ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Display Options</h3>
            <div className="space-y-2">
              {([
                ['show_abv', 'Show ABV'],
                ['show_proof', 'Show Proof'],
                ['show_age', 'Show Age Statement'],
                ['show_company', 'Show Company'],
                ['show_rating', 'Show Rating'],
                ['show_description', 'Show Description'],
                ['show_tasting_notes', 'Show Tasting Notes'],
                ['show_mash_bill', 'Show Mash Bill'],
                ['show_notes', 'Show Notes'],
                ['show_price', 'Show Purchase Price'],
                ['show_batch_number', 'Show Batch Number'],
                ['show_barrel_number', 'Show Barrel Number'],
                ['show_year_distilled', 'Show Year Distilled'],
                ['show_release_year', 'Show Release Year'],
                ['collapse_identical_bottles', 'Collapse Identical Bottles'],
                ['group_by_location', 'Group by Location'],
                ['show_logo', 'Show Logo Watermark'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!settings[key]}
                    onChange={() => toggleSetting(key)}
                    className="rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Bottle Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Select Bottles ({selectedItems.size} selected)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedItems((prev) => {
                    const next = new Set(prev);
                    filteredBunkerItems.forEach((i) => next.add(i.id));
                    return next;
                  })}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-100">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                <div className="flex gap-1.5">
                  {(['sealed', 'opened', 'empty'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatuses((prev) => {
                        const next = new Set(prev);
                        if (next.has(status)) next.delete(status);
                        else next.add(status);
                        return next;
                      })}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                        filterStatuses.has(status)
                          ? 'bg-amber-700 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              {locations.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Location</label>
                  <div className="flex flex-wrap gap-1.5">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setFilterLocations((prev) => {
                          const next = new Set(prev);
                          if (next.has(loc.name)) next.delete(loc.name);
                          else next.add(loc.name);
                          return next;
                        })}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          filterLocations.has(loc.name)
                            ? 'bg-amber-700 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spirit Type Filter */}
              {distinctSpiritTypes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Spirit Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {distinctSpiritTypes.map((st) => (
                      <button
                        key={st}
                        onClick={() => setFilterSpiritTypes((prev) => {
                          const next = new Set(prev);
                          if (next.has(st)) next.delete(st);
                          else next.add(st);
                          return next;
                        })}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                          filterSpiritTypes.has(st)
                            ? 'bg-amber-700 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {(filterStatuses.size > 0 || filterLocations.size > 0 || filterSpiritTypes.size > 0) && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setFilterStatuses(new Set()); setFilterLocations(new Set()); setFilterSpiritTypes(new Set()); }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {bunkerItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No bottles in your bunker yet. Add some first.
              </p>
            ) : filteredBunkerItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No bottles match the selected filters.
              </p>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredBunkerItems.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedItems.has(item.id) ? 'bg-amber-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {item.company_name && `${item.company_name} · `}
                        {item.spirit_subtype || item.spirit_type}
                        {item.abv != null && ` · ${parseFloat((Number(item.abv) * 100).toFixed(2))}%`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
