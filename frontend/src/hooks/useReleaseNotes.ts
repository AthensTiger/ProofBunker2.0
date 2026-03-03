import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { ReleaseNote, ReleaseNotesResponse } from '../types/releaseNotes';

export function useReleaseNotes() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['release-notes'],
    queryFn: () => api.get<ReleaseNotesResponse>('/release-notes'),
  });
}

export function useUnreadReleaseNotesCount() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['release-notes', 'unread'],
    queryFn: () => api.get<{ count: number }>('/release-notes/unread-count'),
    refetchInterval: 5 * 60 * 1000, // re-check every 5 minutes
  });
}

export function useMarkReleaseNotesRead() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.put('/release-notes/mark-read'),
    onSuccess: () => {
      queryClient.setQueryData(['release-notes', 'unread'], { count: 0 });
    },
  });
}

// Admin hooks
export function useAdminReleaseNotes() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['release-notes', 'admin'],
    queryFn: () => api.get<ReleaseNote[]>('/release-notes/admin'),
  });
}

export function useCreateReleaseNote() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; body: string; type: string; version?: string; published?: boolean }) =>
      api.post<ReleaseNote>('/release-notes/admin', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

export function useUpdateReleaseNote() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; body?: string; type?: string; version?: string; published?: boolean }) =>
      api.put<ReleaseNote>(`/release-notes/admin/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}

export function useDeleteReleaseNote() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/release-notes/admin/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-notes'] });
    },
  });
}
