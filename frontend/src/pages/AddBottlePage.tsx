import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAddToBunker } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useSubmitProduct } from '../hooks/useSubmissions';
import { useProductDetail } from '../hooks/useProducts';
import { useUIStore } from '../stores/uiStore';
import type { AutocompleteResult } from '../types/product';
import type { UpcLookupResult } from '../types/product';
import ProductSearch from '../components/add-bottle/ProductSearch';
import ManualUpcInput from '../components/add-bottle/ManualUpcInput';
import BottleDetailsForm from '../components/add-bottle/BottleDetailsForm';
import SubmitNewProductForm from '../components/add-bottle/SubmitNewProductForm';

type Step = 'search' | 'details' | 'submit-new';

export default function AddBottlePage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const { data: locations = [] } = useLocations();
  const addMutation = useAddToBunker();
  const submitMutation = useSubmitProduct();

  const [step, setStep] = useState<Step>('search');
  const [selectedProduct, setSelectedProduct] = useState<AutocompleteResult | UpcLookupResult | null>(null);
  const [unknownUpc, setUnknownUpc] = useState('');

  const { data: productDetail } = useProductDetail(selectedProduct?.id ?? null);

  const handleProductSelect = (product: AutocompleteResult | UpcLookupResult) => {
    setSelectedProduct(product);
    setStep('details');
  };

  const handleUpcNotFound = (upc: string) => {
    setUnknownUpc(upc);
    setStep('submit-new');
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
          navigate(`/bunker/${data.bunker_item_id}`);
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

      {step === 'details' && selectedProduct && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-amber-50 rounded-lg p-4">
            {selectedProduct.image_url ? (
              <img src={selectedProduct.image_url} alt="" className="w-12 h-12 rounded object-cover" />
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
            onCancel={() => { setStep('search'); setSelectedProduct(null); }}
            isPending={addMutation.isPending}
            productName={selectedProduct.name}
            productDetail={productDetail ?? null}
          />
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
