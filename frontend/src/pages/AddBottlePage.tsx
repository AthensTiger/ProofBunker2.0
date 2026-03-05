import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAddToBunker } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useSubmitProduct } from '../hooks/useSubmissions';
import { useProductDetail, useLabelStatus, usePublicSettings, useMarkLabelVerified } from '../hooks/useProducts';
import { useUIStore } from '../stores/uiStore';
import type { AutocompleteResult } from '../types/product';
import type { UpcLookupResult } from '../types/product';
import ProductSearch from '../components/add-bottle/ProductSearch';
import ManualUpcInput from '../components/add-bottle/ManualUpcInput';
import BottleDetailsForm from '../components/add-bottle/BottleDetailsForm';
import SubmitNewProductForm from '../components/add-bottle/SubmitNewProductForm';
import SaveForLaterForm from '../components/add-bottle/SaveForLaterForm';
import LabelScannerModal from '../components/ui/LabelScannerModal';
import LabelVerificationModal from '../components/ui/LabelVerificationModal';

type Step = 'search' | 'label-verify' | 'details' | 'save-or-submit' | 'submit-new';

export default function AddBottlePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useUIStore((s) => s.addToast);
  const { data: locations = [] } = useLocations();
  const addMutation = useAddToBunker();
  const submitMutation = useSubmitProduct();
  const markVerified = useMarkLabelVerified();

  const locationState = location.state as { productId?: number; productName?: string; returnTo?: string } | null;
  const preloadProductId = locationState?.productId ?? null;

  const [step, setStep] = useState<Step>('search');
  const [selectedProduct, setSelectedProduct] = useState<AutocompleteResult | UpcLookupResult | null>(null);
  const [unknownUpc, setUnknownUpc] = useState('');
  const [showLabelScanner, setShowLabelScanner] = useState(false);
  const [labelScanResult, setLabelScanResult] = useState<Record<string, unknown> | null>(null);

  // Load product detail for both normal selection and pre-selected product
  const { data: productDetail } = useProductDetail(selectedProduct?.id ?? preloadProductId);
  const { data: labelStatus } = useLabelStatus(selectedProduct?.id ?? null);
  const { data: publicSettings } = usePublicSettings();

  const requireLabel = publicSettings?.require_label_verification === true;
  const isLabelVerified = labelStatus?.label_verified === true;

  // When arriving with a pre-selected product, jump straight to the appropriate step
  useEffect(() => {
    if (preloadProductId && productDetail && !selectedProduct) {
      setSelectedProduct({
        id: productDetail.id,
        name: productDetail.name,
        spirit_type: productDetail.spirit_type,
        company_name: productDetail.company_name,
        image_url: productDetail.image_url,
      });
      setStep('details');
    }
  }, [preloadProductId, productDetail, selectedProduct]);

  const handleProductSelect = (product: AutocompleteResult | UpcLookupResult) => {
    setSelectedProduct(product);
    // We'll check label status once it loads — for now go to label-verify step
    // which will auto-skip if already verified
    setStep('label-verify');
  };

  const handleUpcNotFound = (upc: string) => {
    setUnknownUpc(upc);
    setStep('save-or-submit');
  };

  const handleAddToBundle = (details: {
    storage_location_id?: number;
    status: string;
    purchase_price?: number;
    batch_number?: string | null;
    barrel_number?: string | null;
    year_distilled?: number | null;
    release_year?: number | null;
    proof?: number | null;
    abv?: number | null;
    age_statement?: string | null;
    mash_bill?: string | null;
  }) => {
    if (!selectedProduct) return;
    addMutation.mutate(
      {
        product_id: selectedProduct.id,
        storage_location_id: details.storage_location_id ?? null,
        status: details.status,
        purchase_price: details.purchase_price ?? null,
        batch_number: details.batch_number,
        barrel_number: details.barrel_number,
        year_distilled: details.year_distilled,
        release_year: details.release_year,
        proof: details.proof,
        abv: details.abv,
        age_statement: details.age_statement,
        mash_bill: details.mash_bill,
      },
      {
        onSuccess: (data) => {
          addToast('success', `"${selectedProduct.name}" added to bunker`);
          navigate(locationState?.returnTo || `/bunker/${data.bunker_item_id}`);
        },
        onError: () => addToast('error', 'Failed to add bottle'),
      }
    );
  };

  const handleSubmitNew = (data: Record<string, unknown>) => {
    if (data.product_id) {
      // Existing product selected — add directly to bunker
      addMutation.mutate(
        {
          product_id: data.product_id as number,
          storage_location_id: (data.storage_location_id as number) ?? null,
          status: (data.status as string) || 'sealed',
          purchase_price: (data.purchase_price as number) ?? null,
        },
        {
          onSuccess: (result) => {
            addToast('success', 'Bottle added to bunker');
            navigate(`/bunker/${result.bunker_item_id}`);
          },
          onError: () => addToast('error', 'Failed to add bottle'),
        }
      );
      return;
    }
    submitMutation.mutate(data as unknown as Parameters<typeof submitMutation.mutate>[0], {
      onSuccess: (result) => {
        addToast('success', 'Product submitted and added to bunker');
        navigate(`/bunker/${result.bunker_item_id}`);
      },
      onError: () => addToast('error', 'Failed to submit product'),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Bottle</h1>
        <button
          onClick={() => navigate('/bunker')}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          Cancel
        </button>
      </div>

      {step === 'search' && (
        <div className="space-y-6">
          <ProductSearch onSelect={handleProductSelect} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">or look up by barcode</span>
            </div>
          </div>

          <ManualUpcInput onFound={handleProductSelect} onNotFound={handleUpcNotFound} />

          <div className="text-center pt-4">
            <button
              onClick={() => setStep('submit-new')}
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              Can't find your bottle? Submit a new product
            </button>
          </div>
        </div>
      )}

      {step === 'label-verify' && selectedProduct && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-amber-50 rounded-lg p-4">
            {selectedProduct.image_url ? (
              <img src={selectedProduct.image_url} alt="" className="w-12 h-12 rounded object-cover object-right" />
            ) : (
              <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                No img
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{selectedProduct.name}</p>
              <p className="text-sm text-gray-600 capitalize">
                {selectedProduct.company_name && `${selectedProduct.company_name} · `}
                {selectedProduct.spirit_type}
              </p>
            </div>
          </div>

          {isLabelVerified ? (
            // Already verified — show badge and let user proceed
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  Label Verified
                  {labelStatus?.label_verification_count > 1 && (
                    <span className="font-normal text-green-600"> ({labelStatus.label_verification_count} verifications)</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">This product's data has been confirmed from a bottle label.</p>
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors"
                >
                  Continue to Add Bottle
                </button>
                <button
                  type="button"
                  onClick={() => setShowLabelScanner(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Re-verify Label
                </button>
              </div>
            </div>
          ) : (
            // Not verified — prompt to scan
            <div className={`rounded-lg p-4 ${requireLabel ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className={`text-sm font-medium ${requireLabel ? 'text-red-800' : 'text-amber-800'}`}>
                  {requireLabel ? 'Label Verification Required' : 'Help Improve Our Data'}
                </span>
              </div>
              <p className={`text-xs ${requireLabel ? 'text-red-700' : 'text-amber-700'} mb-3`}>
                {requireLabel
                  ? 'This product has not been verified from a real bottle label yet. Please photograph the label to confirm the data is accurate.'
                  : 'This product has not been label-verified yet. Photograph the label to confirm the data — it takes seconds and helps everyone.'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLabelScanner(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  Scan Label
                </button>
                {!requireLabel && (
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setStep('search'); setSelectedProduct(null); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to search
          </button>
        </div>
      )}

      {/* Label Scanner Modal */}
      {showLabelScanner && (
        <LabelScannerModal
          productName={selectedProduct?.name}
          onResult={(data) => {
            setShowLabelScanner(false);
            setLabelScanResult({ ...data });
          }}
          onClose={() => setShowLabelScanner(false)}
        />
      )}

      {/* Label Verification Comparison Modal */}
      {labelScanResult && selectedProduct && productDetail && (
        <LabelVerificationModal
          scannedData={labelScanResult}
          currentData={{
            name: productDetail.name,
            spirit_type: productDetail.spirit_type,
            spirit_subtype: productDetail.spirit_subtype,
            company_name: productDetail.company_name,
            distiller_name: productDetail.distiller_name,
            proof: productDetail.proof,
            abv: productDetail.abv,
            age_statement: productDetail.age_statement,
            mash_bill: productDetail.mash_bill,
            barrel_type: productDetail.barrel_type,
            finish_type: productDetail.finish_type,
            volume_ml: productDetail.volume_ml,
            description: productDetail.description,
          }}
          onConfirm={(acceptedData) => {
            setLabelScanResult(null);
            // Mark product as label-verified
            markVerified.mutate(selectedProduct.id, {
              onSuccess: () => {
                if (Object.keys(acceptedData).length > 0) {
                  addToast('success', 'Label verified and data updated');
                } else {
                  addToast('success', 'Label verified — data confirmed accurate');
                }
                setStep('details');
              },
              onError: () => {
                addToast('error', 'Failed to mark as verified');
                setStep('details');
              },
            });
          }}
          onClose={() => setLabelScanResult(null)}
        />
      )}

      {step === 'details' && selectedProduct && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-amber-50 rounded-lg p-4">
            {selectedProduct.image_url ? (
              <img src={selectedProduct.image_url} alt="" className="w-12 h-12 rounded object-cover object-right" />
            ) : (
              <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                No img
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{selectedProduct.name}</p>
              <p className="text-sm text-gray-600 capitalize">
                {selectedProduct.company_name && `${selectedProduct.company_name} · `}
                {selectedProduct.spirit_type}
              </p>
            </div>
          </div>

          <BottleDetailsForm
            locations={locations}
            onSubmit={handleAddToBundle}
            onCancel={() => {
              if (locationState?.returnTo) navigate(locationState.returnTo);
              else { setStep('search'); setSelectedProduct(null); }
            }}
            isPending={addMutation.isPending}
            productName={selectedProduct.name}
            productDetail={productDetail ?? null}
          />
        </div>
      )}

      {step === 'save-or-submit' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <span className="font-mono bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-800 text-xs">{unknownUpc}</span>
            <span>wasn't found in the product database.</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Save for Later</h2>
            <p className="text-sm text-gray-500 mb-4">Record this barcode now and match it to a product later from My Bunker.</p>
            <SaveForLaterForm
              upc={unknownUpc}
              onSaved={() => navigate('/bunker/unresolved')}
              onSubmitNew={() => setStep('submit-new')}
            />
          </div>
        </div>
      )}

      {step === 'submit-new' && (
        <SubmitNewProductForm
          initialUpc={unknownUpc}
          locations={locations}
          onSubmit={handleSubmitNew}
          onCancel={() => { setStep('search'); setUnknownUpc(''); }}
          isPending={submitMutation.isPending || addMutation.isPending}
        />
      )}
    </div>
  );
}
