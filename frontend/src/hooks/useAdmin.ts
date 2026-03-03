import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { AdminProductFilters } from '../types/product';

// ── Pending Products ──────────────────────────────────

export function usePendingProducts() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['admin', 'pending-products'],
    queryFn: () => api.get<any[]>('/admin/pending-products'),
  });
}

export function useApproveProduct() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/admin/products/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useRejectProduct() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/admin/products/${id}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ── Admin Update Product ──────────────────────────────

export function useAdminUpdateProduct() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; [key: string]: unknown }) =>
      api.put(`/admin/products/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ── Product Images ────────────────────────────────────

export function useUploadProductImage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: number; file: File }) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.postFormData<any>(`/admin/products/${productId}/images`, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useUploadProductImageFromUrl() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, url }: { productId: number; url: string }) =>
      api.post<any>(`/admin/products/${productId}/images/url`, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useDeleteProductImage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: number) => api.del(`/admin/products/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ── All Products ──────────────────────────────────────

export function useAllProducts(filters: AdminProductFilters) {
  const api = useApiClient();
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.spirit_type) params.set('spirit_type', filters.spirit_type);
  if (filters.approval_status) params.set('approval_status', filters.approval_status);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_dir) params.set('sort_dir', filters.sort_dir);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  return useQuery({
    queryKey: ['admin', 'all-products', filters],
    queryFn: () => api.get<{ products: any[]; total: number }>(`/admin/products?${params}`),
  });
}

export function useAdminProduct(id: number | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => api.get<any>(`/admin/products/${id}`),
    enabled: id !== null && id > 0,
  });
}

export function useDeleteProduct() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ── Companies ─────────────────────────────────────────

export function useUnverifiedCompanies() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['admin', 'unverified-companies'],
    queryFn: () => api.get<any[]>('/admin/unverified-companies'),
  });
}

export function useAllCompanies(filters: { q?: string; limit?: number; offset?: number }) {
  const api = useApiClient();
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  return useQuery({
    queryKey: ['admin', 'all-companies', filters],
    queryFn: () => api.get<{ companies: any[]; total: number }>(`/admin/companies?${params}`),
  });
}

export function useAdminCompany(id: number | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['admin', 'company', id],
    queryFn: () => api.get<any>(`/admin/companies/${id}`),
    enabled: id !== null && id > 0,
  });
}

export function useUpdateCompany() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; [key: string]: unknown }) =>
      api.put(`/admin/companies/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useDeleteCompany() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/admin/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useMergeCompany() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, target_id }: { id: number; target_id: number }) =>
      api.post(`/admin/companies/${id}/merge`, { target_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ── Distillers ────────────────────────────────────────

export function useUnverifiedDistillers() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['admin', 'unverified-distillers'],
    queryFn: () => api.get<any[]>('/admin/unverified-distillers'),
  });
}

export function useAllDistillers(filters: { q?: string; limit?: number; offset?: number }) {
  const api = useApiClient();
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  return useQuery({
    queryKey: ['admin', 'all-distillers', filters],
    queryFn: () => api.get<{ distillers: any[]; total: number }>(`/admin/distillers?${params}`),
  });
}

export function useAdminDistiller(id: number | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['admin', 'distiller', id],
    queryFn: () => api.get<any>(`/admin/distillers/${id}`),
    enabled: id !== null && id > 0,
  });
}

export function useUpdateDistiller() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; [key: string]: unknown }) =>
      api.put(`/admin/distillers/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useDeleteDistiller() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/admin/distillers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useMergeDistiller() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, target_id }: { id: number; target_id: number }) =>
      api.post(`/admin/distillers/${id}/merge`, { target_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ── Users ─────────────────────────────────────────────

export function useAllUsers(filters: { q?: string; limit?: number; offset?: number }) {
  const api = useApiClient();
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  return useQuery({
    queryKey: ['admin', 'all-users', filters],
    queryFn: () => api.get<{ users: any[]; total: number }>(`/admin/users?${params}`),
  });
}

export function useUpdateUserRole() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] });
    },
  });
}

export function useSetEmailVerified() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email_verified }: { id: number; email_verified: boolean }) =>
      api.put(`/admin/users/${id}/email-verified`, { email_verified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-users'] });
    },
  });
}
