import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { UserPost } from '../types/posts';

export function usePublicPosts() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['posts', 'published'],
    queryFn: () => api.get<UserPost[]>('/posts'),
  });
}

export function useMyPosts() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['posts', 'mine'],
    queryFn: () => api.get<UserPost[]>('/posts/mine'),
  });
}

export function usePendingPosts() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['posts', 'pending'],
    queryFn: () => api.get<UserPost[]>('/posts/pending'),
  });
}

export function useCreatePost() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; product_id?: number | null }) =>
      api.post<UserPost>('/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
    },
  });
}

export function useUpdatePost() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; title?: string; content?: string; product_id?: number | null }) =>
      api.put<UserPost>(`/posts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
    },
  });
}

export function useSubmitPost() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<UserPost>(`/posts/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
    },
  });
}

export function useDeletePost() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'published'] });
    },
  });
}

export function useApprovePost() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      api.post<UserPost>(`/posts/${id}/approve`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useRejectPost() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      api.post<UserPost>(`/posts/${id}/reject`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
