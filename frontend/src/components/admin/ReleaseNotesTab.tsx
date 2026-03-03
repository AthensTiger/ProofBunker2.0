import { useState } from 'react';
import {
  useAdminReleaseNotes,
  useCreateReleaseNote,
  useUpdateReleaseNote,
  useDeleteReleaseNote,
} from '../../hooks/useReleaseNotes';
import { useUIStore } from '../../stores/uiStore';
import type { ReleaseNote } from '../../types/releaseNotes';

const TYPE_OPTIONS: { value: ReleaseNote['type']; label: string }[] = [
  { value: 'new_feature', label: 'New Feature' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'bug_fix',     label: 'Bug Fix' },
  { value: 'other',       label: 'Other' },
];

const TYPE_COLORS: Record<string, string> = {
  new_feature: 'bg-amber-100 text-amber-800',
  enhancement: 'bg-blue-100 text-blue-800',
  bug_fix:     'bg-green-100 text-green-700',
  other:       'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { title: '', body: '', type: 'enhancement' as ReleaseNote['type'], version: '', published: true };

export default function ReleaseNotesTab() {
  const addToast = useUIStore((s) => s.addToast);
  const { data: notes = [], isLoading } = useAdminReleaseNotes();
  const createMutation = useCreateReleaseNote();
  const updateMutation = useUpdateReleaseNote();
  const deleteMutation = useDeleteReleaseNote();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (note: ReleaseNote) => {
    setEditingId(note.id);
    setForm({ title: note.title, body: note.body, type: note.type, version: note.version || '', published: note.published });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;

    const payload = { ...form, version: form.version.trim() || undefined };

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { addToast('success', 'Release note updated'); setShowForm(false); },
        onError: () => addToast('error', 'Failed to update'),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { addToast('success', 'Release note created'); setShowForm(false); },
        onError: () => addToast('error', 'Failed to create'),
      });
    }
  };

  const handleDelete = (note: ReleaseNote) => {
    if (!confirm(`Delete "${note.title}"?`)) return;
    deleteMutation.mutate(note.id, {
      onSuccess: () => addToast('success', 'Deleted'),
      onError: () => addToast('error', 'Failed to delete'),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{notes.length} release note{notes.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors"
        >
          + New Release Note
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-3 border border-amber-200">
          <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Release Note' : 'New Release Note'}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="e.g., Logo watermark on Print Bunker menus"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ReleaseNote['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Version (optional)</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="e.g., 2.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
                rows={4}
                placeholder="Describe what changed and why it matters to users..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                />
                Published (visible to all users)
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.title.trim() || !form.body.trim() || isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400">No release notes yet. Create the first one!</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[note.type] || TYPE_COLORS.other}`}>
                    {TYPE_OPTIONS.find(o => o.value === note.type)?.label || note.type}
                  </span>
                  {note.version && (
                    <span className="text-xs font-mono text-gray-400">v{note.version}</span>
                  )}
                  {!note.published && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">Draft</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-medium text-gray-900 text-sm truncate">{note.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{note.body}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(note)}
                  className="text-sm text-amber-700 hover:text-amber-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(note)}
                  disabled={deleteMutation.isPending}
                  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
