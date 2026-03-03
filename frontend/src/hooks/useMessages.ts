import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { Conversation, DirectMessage, Contact } from '../types/messages';

export function useContacts() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get<Contact[]>('/users/contacts'),
  });
}

export function useConversations() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<Conversation[]>('/messages/conversations'),
    refetchInterval: 30000,
  });
}

export function useGetOrCreateConversation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: number) =>
      api.post<{ id: number }>(`/messages/conversations/${otherUserId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMessages(conversationId: number | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.get<DirectMessage[]>(`/messages/conversations/${conversationId}/messages`),
    enabled: conversationId !== null,
    refetchInterval: 10000,
  });
}

export function useSendMessage(conversationId: number | null) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<DirectMessage>(`/messages/conversations/${conversationId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkRead(conversationId: number | null) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.put(`/messages/conversations/${conversationId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
