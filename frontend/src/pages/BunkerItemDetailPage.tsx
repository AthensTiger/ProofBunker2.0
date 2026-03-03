import { useParams, useNavigate } from 'react-router-dom';
import { useBunkerItem, useRemoveBunkerItem } from '../hooks/useBunker';
import { useLocations } from '../hooks/useLocations';
import { useCurrentUser } from '../hooks/useUser';
import { useUIStore } from '../stores/uiStore';
import ProductInfoSection from '../components/bunker/ProductInfoSection';
import PersonalInfoSection from '../components/bunker/PersonalInfoSection';
import BottlesTable from '../components/bunker/BottlesTable';

export default function BunkerItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const { data: item, isLoading, error } = useBunkerItem(id!);
  const { data: locations = [] } = useLocations();
  const { data: currentUser } = useCurrentUser();
  const removeMutation = useRemoveBunkerItem();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Bunker item not found.</p>
        <button
          onClick={() => navigate('/bunker')}
          className="text-amber-700 hover:text-amber-800 font-medium"
        >
          Back to Bunker
        </button>
      </div>
    );
  }

  const handleRemove = () => {
    if (!confirm(`Remove "${item.name}" and all its bottles from your bunker?`)) return;
    removeMutation.mutate(item.id, {
      onSuccess: () => {
        addToast('success', `"${item.name}" removed`);
        navigate('/bunker');
      },
      onError: () => addToast('error', 'Failed to remove item'),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/bunker')}
          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          &larr; Back to Bunker
        </button>
        <button
          onClick={handleRemove}
          disabled={removeMutation.isPending}
          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {removeMutation.isPending ? 'Removing...' : 'Remove from Bunker'}
        </button>
      </div>

      <div className="space-y-6">
        <ProductInfoSection item={item} user={currentUser} />

        <BottlesTable
          bottles={item.bottles}
          locations={locations}
          productId={item.product_id}
          productName={item.name}
          productContext={{
            proof: item.product_proof,
            abv: item.product_abv,
            age_statement: item.product_age_statement,
            mash_bill: item.product_mash_bill,
            release_year: item.product_release_year,
          }}
        />

        <PersonalInfoSection
          itemId={item.id}
          rating={item.personal_rating}
          notes={item.notes}
        />
      </div>
    </div>
  );
}
