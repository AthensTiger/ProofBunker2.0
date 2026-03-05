import { useState } from 'react';
import type { BunkerItemDetail } from '../../types/bunker';
import { formatProof } from '../../utils/format';
import type { TastingNote, ResearchResult } from '../../types/product';
import type { UserRecord } from '../../types/user';
import { useUpdateProduct, useUpsertTastingNote, useDeleteTastingNote, useResearchProduct } from '../../hooks/useProducts';
import { useUIStore } from '../../stores/uiStore';
import Badge from '../ui/Badge';
import ResearchComparisonModal from '../ui/ResearchComparisonModal';

interface ProductInfoSectionProps {
  item: BunkerItemDetail;
  user?: UserRecord | null;
}

export default function ProductInfoSection({ item, user }: ProductInfoSectionProps) {
  const canEdit = user?.role === 'admin' || user?.role === 'curator';
  const addToast = useUIStore((s) => s.addToast);
  const updateProduct = useUpdateProduct();
  const research = useResearchProduct();
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);

  const handleResearch = () => {
    research.mutate(item.name, {
      onSuccess: (data: ResearchResult) => setResearchResult(data),
      onError: (err: any) => addToast('error', err?.message || 'Research failed'),
    });
  };

  const handleApplyResearch = (selected: Partial<ResearchResult>) => {
    const updates: Record<string, unknown> = { productId: item.product_id };
    if (selected.name != null) updates.name = selected.name;
    if (selected.spirit_type != null) updates.spirit_type = selected.spirit_type;
    if (selected.spirit_subtype != null) updates.spirit_subtype = selected.spirit_subtype;
    if (selected.company_name != null) updates.company_name = selected.company_name;
    if (selected.distiller_name != null) updates.distiller_name = selected.distiller_name;
    if (selected.description != null) updates.description = selected.description;
    if (selected.proof != null) updates.proof = selected.proof;
    if (selected.abv != null) updates.abv = selected.abv;
    if (selected.age_statement != null) updates.age_statement = selected.age_statement;
    if (selected.volume_ml != null) updates.volume_ml = selected.volume_ml;
    if (selected.mash_bill != null) updates.mash_bill = selected.mash_bill;
    if (selected.msrp_usd != null) updates.msrp_usd = selected.msrp_usd;
    if (selected.barrel_type != null) updates.barrel_type = selected.barrel_type;
    if (selected.finish_type != null) updates.finish_type = selected.finish_type;
    updateProduct.mutate(updates as any, {
      onSuccess: () => { addToast('success', 'Product updated'); setResearchResult(null); },
      onError: () => addToast('error', 'Failed to update product'),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {canEdit && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={handleResearch}
            disabled={research.isPending}
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
                Research Product
              </>
            )}
          </button>
        </div>
      )}
      <div className="flex gap-6">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-32 h-40 object-contain rounded-lg bg-gray-50 flex-shrink-0"
          />
        ) : (
          <div className="w-32 h-40 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm flex-shrink-0">
            No image
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{item.name}</h1>
            {item.approval_status === 'pending' && <Badge variant="pending">Pending</Badge>}
            {item.approval_status === 'rejected' && <Badge variant="rejected">Rejected</Badge>}
          </div>

          {item.company_name && (
            <p className="text-gray-600 mb-3">{item.company_name}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-6 text-sm">
            <Detail label="Type" value={item.spirit_type} capitalize />
            {item.spirit_subtype && <Detail label="Subtype" value={item.spirit_subtype} capitalize />}
            {item.proof != null && <Detail label="Proof" value={formatProof(item.proof)} />}
            {item.abv != null && <Detail label="ABV" value={`${parseFloat((Number(item.abv) * 100).toFixed(1))}%`} />}
            {item.age_statement && <Detail label="Age" value={item.age_statement} />}
            {item.volume_ml != null && <Detail label="Volume" value={`${item.volume_ml}ml`} />}
            {item.msrp_usd != null && <Detail label="MSRP" value={`$${item.msrp_usd.toFixed(2)}`} />}
            {item.distiller_name && <Detail label="Distiller" value={item.distiller_name} />}
            {item.barrel_type && <Detail label="Barrel" value={item.barrel_type} />}
            {item.finish_type && <Detail label="Finish" value={item.finish_type} />}
          </div>

          {canEdit ? (
            <EditableMashBill productId={item.product_id} mashBill={item.mash_bill} />
          ) : (
            item.mash_bill && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500">Mash Bill: </span>
                <span className="text-gray-900 font-medium">{item.mash_bill}</span>
              </div>
            )
          )}

          <div className="flex gap-3 mt-3">
            {item.is_limited_edition && <Badge variant="info">Limited Edition</Badge>}
            {item.is_discontinued && <Badge variant="rejected">Discontinued</Badge>}
          </div>

          {item.description && (
            <p className="text-sm text-gray-600 mt-3 italic">{item.description}</p>
          )}
        </div>
      </div>

      <TastingNotesSection
        productId={item.product_id}
        notes={item.tasting_notes}
        canEdit={!!canEdit}
      />

      {researchResult && (
        <ResearchComparisonModal
          result={researchResult}
          currentValues={{
            name: item.name, spirit_type: item.spirit_type, spirit_subtype: item.spirit_subtype,
            company_name: item.company_name, distiller_name: item.distiller_name,
            description: item.description, proof: item.proof, abv: item.abv,
            age_statement: item.age_statement, volume_ml: item.volume_ml,
            mash_bill: item.mash_bill, msrp_usd: item.msrp_usd,
            barrel_type: item.barrel_type, finish_type: item.finish_type,
          }}
          onApply={(selected) => handleApplyResearch(selected)}
          onClose={() => setResearchResult(null)}
        />
      )}
    </div>
  );
}

function EditableMashBill({ productId, mashBill }: { productId: number; mashBill: string | null }) {
  const addToast = useUIStore((s) => s.addToast);
  const updateProduct = useUpdateProduct();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(mashBill || '');

  const handleSave = () => {
    const newValue = value.trim() || null;
    if (newValue === mashBill) {
      setEditing(false);
      return;
    }
    updateProduct.mutate(
      { productId, mash_bill: newValue },
      {
        onSuccess: () => { addToast('success', 'Mash bill updated'); setEditing(false); },
        onError: () => addToast('error', 'Failed to update mash bill'),
      }
    );
  };

  if (!editing) {
    return (
      <div className="mt-2 text-sm flex items-center gap-2">
        <span className="text-gray-500">Mash Bill: </span>
        <span className="text-gray-900 font-medium">{mashBill || '--'}</span>
        <button
          onClick={() => { setValue(mashBill || ''); setEditing(true); }}
          className="text-amber-700 hover:text-amber-800 text-xs font-medium"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <label className="block text-sm text-gray-500 mb-1">Mash Bill</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., 75% corn, 13% rye, 12% malted barley"
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button onClick={handleSave} disabled={updateProduct.isPending} className="text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded disabled:opacity-50">
          {updateProduct.isPending ? '...' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

function TastingNotesSection({ productId, notes, canEdit }: { productId: number; notes: TastingNote[]; canEdit: boolean }) {
  const addToast = useUIStore((s) => s.addToast);
  const upsertNote = useUpsertTastingNote();
  const deleteNote = useDeleteTastingNote();
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState({ source_name: '', nose: '', palate: '', finish: '', overall_notes: '' });

  const startEdit = (note?: TastingNote) => {
    if (note) {
      setForm({
        source_name: note.source_name || '',
        nose: note.nose || '',
        palate: note.palate || '',
        finish: note.finish || '',
        overall_notes: note.overall_notes || '',
      });
      setEditingId(note.id);
    } else {
      setForm({ source_name: '', nose: '', palate: '', finish: '', overall_notes: '' });
      setEditingId('new');
    }
  };

  const handleSave = () => {
    const body: Record<string, unknown> = {
      productId,
      source_name: form.source_name.trim(),
      nose: form.nose.trim(),
      palate: form.palate.trim(),
      finish: form.finish.trim(),
      overall_notes: form.overall_notes.trim(),
    };
    if (editingId !== 'new') body.id = editingId;

    upsertNote.mutate(body as any, {
      onSuccess: () => { addToast('success', 'Tasting note saved'); setEditingId(null); },
      onError: () => addToast('error', 'Failed to save tasting note'),
    });
  };

  const handleDelete = (noteId: number) => {
    if (!confirm('Delete this tasting note?')) return;
    deleteNote.mutate(
      { productId, noteId },
      {
        onSuccess: () => addToast('success', 'Tasting note deleted'),
        onError: () => addToast('error', 'Failed to delete tasting note'),
      }
    );
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase">Tasting Notes</h3>
        {canEdit && editingId === null && (
          <button
            onClick={() => startEdit()}
            className="text-xs font-medium text-amber-700 hover:text-amber-800"
          >
            + Add Note
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
          <input
            type="text"
            value={form.source_name}
            onChange={(e) => setForm((f) => ({ ...f, source_name: e.target.value }))}
            placeholder="Source (e.g., Personal, Whiskey Advocate)"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            value={form.nose}
            onChange={(e) => setForm((f) => ({ ...f, nose: e.target.value }))}
            placeholder="Nose"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            value={form.palate}
            onChange={(e) => setForm((f) => ({ ...f, palate: e.target.value }))}
            placeholder="Palate"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            value={form.finish}
            onChange={(e) => setForm((f) => ({ ...f, finish: e.target.value }))}
            placeholder="Finish"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <textarea
            value={form.overall_notes}
            onChange={(e) => setForm((f) => ({ ...f, overall_notes: e.target.value }))}
            placeholder="Overall notes"
            rows={2}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={upsertNote.isPending} className="text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded disabled:opacity-50">
              {upsertNote.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditingId(null)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="text-sm">
              <div className="flex items-center justify-between">
                {note.source_name && (
                  <p className="font-medium text-gray-900 mb-1">
                    {note.source_name}
                    {note.rating_value != null && (
                      <span className="text-gray-500 ml-2">
                        {note.rating_value}{note.rating_scale ? `/${note.rating_scale}` : ''}
                      </span>
                    )}
                  </p>
                )}
                {canEdit && editingId === null && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(note)} className="text-xs text-amber-700 hover:text-amber-800 font-medium">Edit</button>
                    <button onClick={() => handleDelete(note.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                )}
              </div>
              {note.nose && <p className="text-gray-600"><span className="font-medium">Nose:</span> {note.nose}</p>}
              {note.palate && <p className="text-gray-600"><span className="font-medium">Palate:</span> {note.palate}</p>}
              {note.finish && <p className="text-gray-600"><span className="font-medium">Finish:</span> {note.finish}</p>}
              {note.overall_notes && <p className="text-gray-600">{note.overall_notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        editingId === null && <p className="text-sm text-gray-400">No tasting notes yet.</p>
      )}
    </div>
  );
}

function Detail({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className={`text-gray-900 font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</span>
    </div>
  );
}
