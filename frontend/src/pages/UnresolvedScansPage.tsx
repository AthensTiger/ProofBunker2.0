import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnresolvedScans, useResolveUnresolvedScan, useDeleteUnresolvedScan } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useSubmitProduct } from '../hooks/useSubmissions';
import { useUIStore } from '../stores/uiStore';
import type { AutocompleteResult } from '../types/product';
import type { UnresolvedScan } from '../types/bunker';
import ProductSearch from '../components/add-bottle/ProductSearch';
import SubmitNewProductForm from '../components/add-bottle/SubmitNewProductForm';
import Lightbox from '../components/ui/Lightbox';

export default function UnresolvedScansPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const { data: scans = [], isLoading } = useUnresolvedScans();
  const { data: locations = [] } = useLocations();
  const resolveMutation = useResolveUnresolvedScan();
  const deleteMutation = useDeleteUnresolvedScan();
  const submitMutation = useSubmitProduct();

  // Search-match flow
  const [matchingScanId, setMatchingScanId] = useState<number | null>(null);
  const [pendingProduct, setPendingProduct] = useState<AutocompleteResult | null>(null);

  // New-product submission flow — replaces list with single-scan form view
  const [submitNewScan, setSubmitNewScan] = useState<UnresolvedScan | null>(null);

  // Lightbox
  const [lightbox, setLightbox] = useState<{ photos: UnresolvedScan['photos']; index: number } | null>(null);

  const openMatch = (scanId: number) => {
    setMatchingScanId(scanId);
    setPendingProduct(null);
  };

  const closeMatch = () => {
    setMatchingScanId(null);
    setPendingProduct(null);
  };

  const handleConfirmResolve = (scanId: number) => {
    if (!pendingProduct) return;
    resolveMutation.mutate(
      { id: scanId, product_id: pendingProduct.id },
      {
        onSuccess: (data) => {
          addToast('success', 'Added to your bunker');
          closeMatch();
          navigate(`/bunker/${data.bunker_item_id}`);
        },
        onError: () => addToast('error', 'Failed to resolve barcode'),
      }
    );
  };

  const handleDelete = (scanId: number) => {
    if (!confirm('Delete this unresolved barcode? This cannot be undone.')) return;
    deleteMutation.mutate(scanId, {
      onError: () => addToast('error', 'Failed to delete'),
    });
  };

  // Called when SubmitNewProductForm fires onSubmit
  const handleSubmitNewProduct = (data: Record<string, unknown>) => {
    if (!submitNewScan) return;
    const scanId = submitNewScan.id;

    if (data.product_id) {
      // Existing product selected via the form's autocomplete → resolve normally
      resolveMutation.mutate(
        { id: scanId, product_id: data.product_id as number },
        {
          onSuccess: (result) => {
            addToast('success', 'Added to your bunker');
            setSubmitNewScan(null);
            navigate(`/bunker/${result.bunker_item_id}`);
          },
          onError: () => addToast('error', 'Failed to resolve barcode'),
        }
      );
      return;
    }

    // New product → submit with scan_id so photos transfer and scan is deleted
    submitMutation.mutate(
      { ...(data as unknown as Parameters<typeof submitMutation.mutate>[0]), scan_id: scanId },
      {
        onSuccess: (result) => {
          addToast('success', 'Product submitted and added to bunker');
          setSubmitNewScan(null);
          navigate(`/bunker/${result.bunker_item_id}`);
        },
        onError: () => addToast('error', 'Failed to submit product'),
      }
    );
  };

  // ── New-product form view ────────────────────────────────────────────────
  if (submitNewScan) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setSubmitNewScan(null)}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium mb-6 flex items-center gap-1"
        >
          ← Back to Unknown Barcodes
        </button>

        {/* Scan reference */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-4">
          {submitNewScan.photos.length > 0 && (
            <div className="flex gap-1.5 flex-shrink-0">
              {submitNewScan.photos.slice(0, 3).map((p, photoIdx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox({ photos: submitNewScan.photos, index: photoIdx })}
                  className="block flex-shrink-0 focus:outline-none"
                >
                  <img src={p.cdn_url} alt="" className="w-14 h-14 object-cover rounded border border-amber-200 hover:opacity-80 transition-opacity cursor-zoom-in" />
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="font-mono text-sm font-semibold text-gray-900">{submitNewScan.upc}</p>
            <div className="flex flex-wrap gap-2 mt-0.5">
              {submitNewScan.location_name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                  {submitNewScan.location_name}
                </span>
              )}
              <span className="text-xs text-gray-400">{new Date(submitNewScan.created_at).toLocaleDateString()}</span>
            </div>
            {submitNewScan.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{submitNewScan.notes}</p>}
          </div>
        </div>

        <SubmitNewProductForm
          initialUpc={submitNewScan.upc}
          locations={locations}
          onSubmit={handleSubmitNewProduct}
          onCancel={() => setSubmitNewScan(null)}
          isPending={submitMutation.isPending || resolveMutation.isPending}
        />

      {lightbox && (
        <Lightbox
          images={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
      </div>
    );
  }

  // ── Main list view ───────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unknown Barcodes</h1>
          <p className="text-sm text-gray-500 mt-1">Match each barcode to a product to add it to your bunker.</p>
        </div>
        <button
          onClick={() => navigate('/bunker')}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          ← My Bunker
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium mb-1">All caught up!</p>
          <p className="text-sm">No unknown barcodes waiting to be matched.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => {
            const isMatching = matchingScanId === scan.id;

            return (
              <div key={scan.id} className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 flex items-start gap-3">
                  {scan.photos.length > 0 && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      {scan.photos.slice(0, 3).map((p, photoIdx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLightbox({ photos: scan.photos, index: photoIdx })}
                          className="block flex-shrink-0 focus:outline-none"
                        >
                          <img
                            src={p.cdn_url}
                            alt=""
                            className="w-16 h-16 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity cursor-zoom-in"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-base font-semibold text-gray-900">{scan.upc}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {scan.location_name && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                          {scan.location_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {scan.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{scan.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                    <button
                      onClick={() => isMatching ? closeMatch() : openMatch(scan.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors"
                    >
                      {isMatching ? 'Cancel' : 'Match Product'}
                    </button>
                    <button
                      onClick={() => handleDelete(scan.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline product search */}
                {isMatching && (
                  <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 space-y-3">
                    {!pendingProduct ? (
                      <>
                        <ProductSearch
                          onSelect={(product) => {
                            setMatchingScanId(scan.id);
                            setPendingProduct(product);
                          }}
                        />
                        <p className="text-xs text-center text-gray-500 pt-1">
                          Product not in the database?{' '}
                          <button
                            onClick={() => { closeMatch(); setSubmitNewScan(scan); }}
                            className="text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
                          >
                            Submit a new product →
                          </button>
                        </p>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white border border-amber-200 rounded-lg px-3 py-2">
                          {pendingProduct.image_url ? (
                            <img src={pendingProduct.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{pendingProduct.name}</p>
                            <p className="text-xs text-gray-500">{pendingProduct.company_name}</p>
                          </div>
                          <button
                            onClick={() => setPendingProduct(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 ml-auto flex-shrink-0"
                          >
                            Change
                          </button>
                        </div>
                        <button
                          onClick={() => handleConfirmResolve(scan.id)}
                          disabled={resolveMutation.isPending}
                          className="w-full py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {resolveMutation.isPending ? 'Adding…' : 'Add to Bunker'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
