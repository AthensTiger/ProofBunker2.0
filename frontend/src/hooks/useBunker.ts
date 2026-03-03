import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { BunkerListItem, BunkerItemDetail, BunkerFilters, AddToBunkerRequest, AddToBunkerResponse } from '../types/bunker';

export function useBunkerList(filters: BunkerFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['bunker', 'list', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.spirit_type) params.set('spirit_type', filters.spirit_type);
      if (filters.location_id) params.set('location_id', String(filters.location_id));
      if (filters.statuses?.length) params.set('status', filters.statuses.join(','));
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_dir) params.set('sort_dir', filters.sort_dir);
      const qs = params.toString();
      return api.get<BunkerListItem[]>(`/bunker${qs ? '?' + qs : ''}`);
    },
  });
}

export function useBunkerItem(id: number | string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['bunker', 'item', id],
    queryFn: () => api.get<BunkerItemDetail>(`/bunker/${id}`),
    enabled: !!id,
  });
}

export function useAddToBunker() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddToBunkerRequest) =>
      api.post<AddToBunkerResponse>('/bunker', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useUpdateBunkerItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: number;
      personal_rating?: number | null;
      notes?: string | null;
      batch_number?: string | null;
      barrel_number?: string | null;
      year_distilled?: number | null;
      release_year?: number | null;
      proof?: number | null;
      abv?: number | null;
      age_statement?: string | null;
      mash_bill?: string | null;
    }) => api.put(`/bunker/${id}`, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bunker', 'item', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bunker', 'item', String(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ['bunker', 'list'] });
    },
  });
}

export function useRemoveBunkerItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/bunker/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker', 'list'] });
    },
  });
}

export function useUpdateBottle() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bottleId, ...body }: {
      bottleId: number;
      storage_location_id?: number | null;
      status?: string;
      purchase_price?: number | null;
      batch_number?: string | null;
      barrel_number?: string | null;
      year_distilled?: number | null;
      release_year?: number | null;
      proof?: number | null;
      abv?: number | null;
      age_statement?: string | null;
      mash_bill?: string | null;
    }) => api.put(`/bunker/bottles/${bottleId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useDeleteBottle() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bottleId: number) => api.del(`/bunker/bottles/${bottleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useUploadBottlePhoto() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bottleId, file }: { bottleId: number; file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      return api.postFormData(`/bunker/bottles/${bottleId}/photos`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useUploadBottlePhotoFromUrl() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bottleId, url }: { bottleId: number; url: string }) =>
      api.post(`/bunker/bottles/${bottleId}/photos/url`, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}

export function useDeleteBottlePhoto() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => api.del(`/bunker/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bunker'] });
    },
  });
}
