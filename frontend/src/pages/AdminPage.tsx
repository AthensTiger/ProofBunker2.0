import { useState } from 'react';
import {
  usePendingProducts,
  useApproveProduct,
  useRejectProduct,
  useUnverifiedCompanies,
  useUpdateCompany,
  useMergeCompany,
  useUnverifiedDistillers,
  useUpdateDistiller,
  useMergeDistiller,
} from '../hooks/useAdmin';
import { useCompanyAutocomplete, useDistillerAutocomplete } from '../hooks/useProducts';
import Combobox from '../components/ui/Combobox';
import ProductEditModal from '../components/admin/ProductEditModal';
import AllProductsTab from '../components/admin/AllProductsTab';
import AllCompaniesTab from '../components/admin/AllCompaniesTab';
import AllDistillersTab from '../components/admin/AllDistillersTab';
import AllUsersTab from '../components/admin/AllUsersTab';
import SupportTicketsTab from '../components/support/SupportTicketsTab';
import PostsApprovalTab from '../components/admin/PostsApprovalTab';
import type { CompanyAutocompleteResult, DistillerAutocompleteResult } from '../types/product';

type Tab = 'pending-products' | 'all-products' | 'unverified-companies' | 'all-companies' | 'unverified-distillers' | 'all-distillers' | 'users' | 'support-tickets' | 'posts-approval';

const TABS: [Tab, string][] = [
  ['pending-products', 'Pending Products'],
  ['all-products', 'All Products'],
  ['unverified-companies', 'Unverified Companies'],
  ['all-companies', 'All Companies'],
  ['unverified-distillers', 'Unverified Distillers'],
  ['all-distillers', 'All Distillers'],
  ['users', 'Users'],
  ['support-tickets', 'Support Tickets'],
  ['posts-approval', 'Posts Approval'],
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('pending-products');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-4 min-w-max">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-amber-700 text-amber-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'pending-products' && <PendingProductsTab />}
      {tab === 'all-products' && <AllProductsTab />}
      {tab === 'unverified-companies' && <UnverifiedCompaniesTab />}
      {tab === 'all-companies' && <AllCompaniesTab />}
      {tab === 'unverified-distillers' && <UnverifiedDistillersTab />}
      {tab === 'all-distillers' && <AllDistillersTab />}
      {tab === 'users' && <AllUsersTab />}
      {tab === 'support-tickets' && <SupportTicketsTab />}
      {tab === 'posts-approval' && <PostsApprovalTab />}
    </div>
  );
}

// ── Pending Products ──────────────────────────────────

function PendingProductsTab() {
  const { data: products, isLoading } = usePendingProducts();
  const approve = useApproveProduct();
  const reject = useRejectProduct();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (!products?.length) return <p className="text-gray-500 text-sm">No pending products.</p>;

  return (
    <div className="space-y-3">
      {products.map((p: any) => (
        <div key={p.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="text-left"
              >
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500">
                  {p.spirit_type}{p.spirit_subtype ? ` / ${p.spirit_subtype}` : ''}
                  {p.company_name ? ` \u2014 ${p.company_name}` : ''}
                </p>
                {p.submitted_by_name && (
                  <p className="text-xs text-gray-400 mt-0.5">Submitted by {p.submitted_by_name}</p>
                )}
              </button>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditId(p.id)}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md"
              >
                Edit
              </button>
              <button
                onClick={() => approve.mutate(p.id)}
                disabled={approve.isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => reject.mutate(p.id)}
                disabled={reject.isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>

          {expandedId === p.id && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <Field label="Distiller" value={p.distiller_name} />
              <Field label="Proof" value={p.proof} />
              <Field label="ABV" value={p.abv ? `${p.abv}%` : null} />
              <Field label="Age" value={p.age_statement} />
              <Field label="Volume" value={p.volume_ml ? `${p.volume_ml}ml` : null} />
              <Field label="MSRP" value={p.msrp_usd ? `$${p.msrp_usd}` : null} />
              <Field label="Mash Bill" value={p.mash_bill} />
              <Field label="Barrel Type" value={p.barrel_type} />
              <Field label="Barrel Char" value={p.barrel_char_level} />
              <Field label="Finish" value={p.finish_type} />
              <Field label="Distillation" value={p.distillation_method} />
              <Field label="Batch #" value={p.batch_number} />
              <Field label="Barrel #" value={p.barrel_number} />
              <Field label="Vintage" value={p.vintage_year} />
              <Field label="Release Year" value={p.release_year} />
              {p.is_limited_edition && <span className="text-amber-700 font-medium">Limited Edition</span>}
              {p.is_discontinued && <span className="text-red-600 font-medium">Discontinued</span>}
              {p.is_single_cask && <span className="text-amber-700 font-medium">Single Cask</span>}
              {p.cask_strength && <span className="text-amber-700 font-medium">Cask Strength</span>}
              {p.description && (
                <div className="col-span-full">
                  <span className="text-gray-500">Description:</span>{' '}
                  <span className="text-gray-700">{p.description}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {editId && <ProductEditModal productId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <span className="text-gray-500">{label}:</span>{' '}
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

// ── Unverified Companies ──────────────────────────────

function UnverifiedCompaniesTab() {
  const { data: companies, isLoading } = useUnverifiedCompanies();
  const update = useUpdateCompany();
  const merge = useMergeCompany();
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);

  const { data: autocompleteResults = [] } = useCompanyAutocomplete(editName);

  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (!companies?.length) return <p className="text-gray-500 text-sm">All companies are verified.</p>;

  const startEdit = (c: any) => {
    setEditId(c.id);
    setEditName(c.name);
    setMergeTargetId(null);
  };

  const save = (id: number) => {
    if (mergeTargetId) {
      merge.mutate({ id, target_id: mergeTargetId }, { onSuccess: () => { setEditId(null); setMergeTargetId(null); } });
    } else {
      update.mutate({ id, name: editName, is_verified: true }, { onSuccess: () => setEditId(null) });
    }
  };

  const verify = (id: number) => {
    update.mutate({ id, is_verified: true });
  };

  return (
    <div className="space-y-2">
      {companies.map((c: any) => (
        <div key={c.id} className="bg-white rounded-lg shadow px-4 py-3">
          {editId === c.id ? (
            <div className="space-y-2">
              <Combobox<CompanyAutocompleteResult>
                label="Company Name"
                value={editName}
                onChange={(v) => { setEditName(v); setMergeTargetId(null); }}
                onSelect={(selected) => {
                  setEditName(selected.name);
                  if (selected.id !== c.id) setMergeTargetId(selected.id);
                }}
                results={autocompleteResults.filter((r) => r.id !== c.id)}
                renderItem={(r) => (
                  <div>
                    <span className="font-medium">{r.name}</span>
                    {r.country && <span className="text-xs text-gray-500 ml-1">({r.country})</span>}
                  </div>
                )}
                getItemLabel={(r) => r.name}
              />
              {mergeTargetId && (
                <p className="text-xs text-amber-700 font-medium">
                  Will merge into existing company. {c.product_count} product{c.product_count !== 1 ? 's' : ''} will be reassigned.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => save(c.id)}
                  disabled={update.isPending || merge.isPending}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                >
                  {mergeTargetId ? 'Merge & Delete' : 'Save & Verify'}
                </button>
                <button
                  onClick={() => { setEditId(null); setMergeTargetId(null); }}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-medium text-gray-900">{c.name}</span>
                <span className="text-xs text-gray-400 ml-2">({c.product_count} product{c.product_count !== 1 ? 's' : ''})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(c)}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Edit
                </button>
                <button
                  onClick={() => verify(c.id)}
                  disabled={update.isPending}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Unverified Distillers ──────────────────────────────

function UnverifiedDistillersTab() {
  const { data: distillers, isLoading } = useUnverifiedDistillers();
  const update = useUpdateDistiller();
  const merge = useMergeDistiller();
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);

  const { data: autocompleteResults = [] } = useDistillerAutocomplete(editName);

  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (!distillers?.length) return <p className="text-gray-500 text-sm">All distillers are verified.</p>;

  const startEdit = (d: any) => {
    setEditId(d.id);
    setEditName(d.name);
    setMergeTargetId(null);
  };

  const save = (id: number) => {
    if (mergeTargetId) {
      merge.mutate({ id, target_id: mergeTargetId }, { onSuccess: () => { setEditId(null); setMergeTargetId(null); } });
    } else {
      update.mutate({ id, name: editName, is_verified: true }, { onSuccess: () => setEditId(null) });
    }
  };

  const verify = (id: number) => {
    update.mutate({ id, is_verified: true });
  };

  return (
    <div className="space-y-2">
      {distillers.map((d: any) => (
        <div key={d.id} className="bg-white rounded-lg shadow px-4 py-3">
          {editId === d.id ? (
            <div className="space-y-2">
              <Combobox<DistillerAutocompleteResult>
                label="Distiller Name"
                value={editName}
                onChange={(v) => { setEditName(v); setMergeTargetId(null); }}
                onSelect={(selected) => {
                  setEditName(selected.name);
                  if (selected.id !== d.id) setMergeTargetId(selected.id);
                }}
                results={autocompleteResults.filter((r) => r.id !== d.id)}
                renderItem={(r) => (
                  <div>
                    <span className="font-medium">{r.name}</span>
                    {(r.region || r.country) && <span className="text-xs text-gray-500 ml-1">({[r.region, r.country].filter(Boolean).join(', ')})</span>}
                  </div>
                )}
                getItemLabel={(r) => r.name}
              />
              {mergeTargetId && (
                <p className="text-xs text-amber-700 font-medium">
                  Will merge into existing distiller. {d.product_count} product{d.product_count !== 1 ? 's' : ''} will be reassigned.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => save(d.id)}
                  disabled={update.isPending || merge.isPending}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                >
                  {mergeTargetId ? 'Merge & Delete' : 'Save & Verify'}
                </button>
                <button
                  onClick={() => { setEditId(null); setMergeTargetId(null); }}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-medium text-gray-900">{d.name}</span>
                <span className="text-xs text-gray-400 ml-2">({d.product_count} product{d.product_count !== 1 ? 's' : ''})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(d)}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Edit
                </button>
                <button
                  onClick={() => verify(d.id)}
                  disabled={update.isPending}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
