import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { MenuTemplate, MenuTemplateDetail, MenuPreviewData, MenuSettings } from '../types/menu';

export function useMenuTemplates() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['menus'],
    queryFn: () => api.get<MenuTemplate[]>('/menus'),
  });
}

export function useMenuTemplate(id: number | string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['menus', id],
    queryFn: () => api.get<MenuTemplateDetail>(`/menus/${id}`),
    enabled: !!id,
  });
}

export function useCreateMenuTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; title?: string; subtitle?: string; settings?: MenuSettings }) =>
      api.post<MenuTemplate>('/menus', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useUpdateMenuTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; title?: string; subtitle?: string; settings?: MenuSettings }) =>
      api.put<MenuTemplate>(`/menus/${id}`, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      queryClient.invalidateQueries({ queryKey: ['menus', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['menus', String(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ['menus', String(variables.id), 'preview'] });
    },
  });
}

export function useDeleteMenuTemplate() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/menus/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

export function useSetMenuItems() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: number; items: { bunker_item_id: number; display_order: number; section_override?: string }[] }) =>
      api.put<{ updated: number }>(`/menus/${id}/items`, { items }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menus', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['menus', String(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ['menus', String(variables.id), 'preview'] });
    },
  });
}

export function useMenuPreview(id: number | string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['menus', id, 'preview'],
    queryFn: () => api.get<MenuPreviewData>(`/menus/${id}/preview`),
    enabled: !!id,
  });
}
