import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { BunkerShare, ShareVisibility, SharedBunker, SharedBunkerItemsResponse } from '../types/share';

export function useMyShares() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['shares', 'mine'],
    queryFn: () => api.get<BunkerShare[]>('/shares'),
  });
}

export function useCreateShare() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; visibility?: ShareVisibility }) =>
      api.post<BunkerShare>('/shares', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', 'mine'] });
    },
  });
}

export function useUpdateShare() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, visibility }: { id: number; visibility: ShareVisibility }) =>
      api.put<BunkerShare>(`/shares/${id}`, { visibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', 'mine'] });
    },
  });
}

export function useDeleteShare() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/shares/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', 'mine'] });
    },
  });
}

export function useSharedBunkers() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['shares', 'received'],
    queryFn: () => api.get<SharedBunker[]>('/shares/received'),
  });
}

export function useSharedBunkerItems(shareId: number | string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['shares', 'received', shareId],
    queryFn: () => api.get<SharedBunkerItemsResponse>(`/shares/received/${shareId}`),
    enabled: !!shareId,
  });
}
