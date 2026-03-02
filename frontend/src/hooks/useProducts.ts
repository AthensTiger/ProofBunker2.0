import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type {
  AutocompleteResult, UpcLookupResult, SpiritTypeCount,
  ProductDetail, CompanyAutocompleteResult, DistillerAutocompleteResult,
  ResearchResult,
} from '../types/product';

export function useSpiritTypes() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['products', 'spirit-types'],
    queryFn: async () => {
      const data = await api.get<{ spirit_types: SpiritTypeCount[] }>('/products/filters');
      return data.spirit_types;
    },
    staleTime: 60_000,
  });
}

export function useAutocomplete(query: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['products', 'autocomplete', query],
    queryFn: () => api.get<AutocompleteResult[]>(`/products/autocomplete?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

export function useUpcLookup(upc: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['products', 'upc', upc],
    queryFn: () => api.get<UpcLookupResult>(`/products/upc/${encodeURIComponent(upc)}`),
    enabled: upc.length >= 8,
    retry: false,
  });
}

export function useUpdateProduct() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, ...body }: { productId: number; mash_bill?: string | null; description?: string | null }) =>
      api.put(`/products/${productId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useUpsertTastingNote() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, ...body }: { productId: number; id?: number; source_name?: string; nose?: string; palate?: string; finish?: string; overall_notes?: string }) =>
      api.post(`/products/${productId}/tasting-notes`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useDeleteTastingNote() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, noteId }: { productId: number; noteId: number }) =>
      api.del(`/products/${productId}/tasting-notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useCompanyAutocomplete(query: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['products', 'companies', 'autocomplete', query],
    queryFn: () => api.get<CompanyAutocompleteResult[]>(`/products/companies/autocomplete?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

export function useDistillerAutocomplete(query: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['products', 'distillers', 'autocomplete', query],
    queryFn: () => api.get<DistillerAutocompleteResult[]>(`/products/distillers/autocomplete?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

export function useResearchProduct() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (query: string) =>
      api.post<ResearchResult>('/research/product', { query }),
  });
}

export function useProductDetail(id: number | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => api.get<ProductDetail>(`/products/${id}`),
    enabled: id !== null && id > 0,
  });
}
