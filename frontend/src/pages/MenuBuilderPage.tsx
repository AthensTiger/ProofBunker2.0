import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMenuTemplates, useCreateMenuTemplate, useDeleteMenuTemplate } from '../hooks/useMenus';
import { useUIStore } from '../stores/uiStore';
import Dialog from '../components/ui/Dialog';
import type { MenuTemplate } from '../types/menu';

export default function MenuBuilderPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const { data: templates = [], isLoading } = useMenuTemplates();
  const createMutation = useCreateMenuTemplate();
  const deleteMutation = useDeleteMenuTemplate();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MenuTemplate | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(
      { name: newName.trim(), settings: { columns: 2, show_abv: true, show_company: true, show_age: true, show_rating: false, show_description: false, show_tasting_notes: false, show_mash_bill: false, show_notes: false, show_price: false, show_logo: false } },
      {
        onSuccess: (template) => {
          setShowCreate(false);
          setNewName('');
          navigate(`/menus/${template.id}/edit`);
        },
        onError: () => addToast('error', 'Failed to create template'),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        addToast('success', `"${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
      },
      onError: () => addToast('error', 'Failed to delete template'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Print Bunker</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
        >
          New Template
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Print Bunker lets you create a formatted list of bottles from your collection — similar to a wine or cocktail list you'd find on a restaurant menu. Choose which bottles to include, customise the layout, then print or save as a PDF.
      </p>

      {templates.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">&#128196;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No print templates yet</h2>
          <p className="text-gray-500 mb-8">Create a template to build a print-ready list of your bunker — like a wine or cocktail list on a restaurant menu.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-800 transition-colors"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
              {template.title && <p className="text-sm text-gray-500 mb-2">{template.title}</p>}
              <p className="text-xs text-gray-400 mb-4">
                {template.item_count || 0} items
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/menus/${template.id}/edit`)}
                  className="flex-1 text-sm font-medium text-amber-700 hover:text-amber-800 py-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/menus/${template.id}/preview`)}
                  className="flex-1 text-sm font-medium text-gray-600 hover:text-gray-900 py-1"
                >
                  Preview
                </button>
                <button
                  onClick={() => setDeleteTarget(template)}
                  className="text-sm font-medium text-red-500 hover:text-red-700 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="New Print Bunker Template">
        <p className="text-sm text-gray-600 mb-4">
          Print Bunker lets you create a formatted list of bottles from your collection — similar to a wine or cocktail list you'd find on a restaurant menu. Choose which bottles to include, customise the layout, then print or save as a PDF.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Bar Menu, Tasting Party"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Template"
      >
        <p className="text-gray-600 mb-6">
          Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
