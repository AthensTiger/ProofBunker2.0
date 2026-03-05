import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';

interface SubmitProductRequest {
  name: string;
  spirit_type: string;
  spirit_subtype?: string;
  abv?: number;
  proof?: number;
  age_statement?: string;
  volume_ml?: number;
  mash_bill?: string;
  barrel_type?: string;
  finish_type?: string;
  description?: string;
  company_name?: string;
  upc?: string;
  storage_location_id?: number;
  status?: string;
  purchase_price?: number;
  scan_id?: number;
}

interface SubmitProductResponse {
  product_id: number;
  bunker_item_id: number;
  approval_status: string;
}

export function useSubmitProduct() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitProductRequest) =>
      api.post<SubmitProductResponse>('/submissions', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}
