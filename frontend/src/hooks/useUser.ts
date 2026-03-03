import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { useApiClient } from '../api/client';
import type { UserRecord } from '../types/user';

export function useCurrentUser() {
  const api = useApiClient();
  const { isAuthenticated } = useAuth0();
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.get<UserRecord>('/users/me'),
    enabled: isAuthenticated,
  });
}

export function useVerifyAge() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.put<UserRecord>('/users/me/verify-age'),
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'me'], data);
    },
  });
}

export function useUpdateProfile() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { display_name?: string | null; avatar_url?: string | null }) =>
      api.put<UserRecord>('/users/me', body),
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'me'], data);
    },
  });
}

export function useUpdatePreferences() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: Record<string, unknown>) =>
      api.put<UserRecord>('/users/me/preferences', preferences),
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'me'], data);
    },
  });
}

export function useUploadUserLogo() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('logo', file);
      return api.postFormData<UserRecord>('/users/me/logo', fd);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'me'], data);
    },
  });
}
