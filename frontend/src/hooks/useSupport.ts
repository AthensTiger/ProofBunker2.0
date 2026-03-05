import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/client';
import type { ChatMessage, SupportTicket, TicketNote } from '../types/support';

export function useChatHistory() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['support', 'chat'],
    queryFn: () => api.get<ChatMessage[]>('/support/chat/history'),
  });
}

export function useSendChatMessage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      api.post<{ message: ChatMessage }>('/support/chat', { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'chat'] });
    },
  });
}

export function useClearChatHistory() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.del('/support/chat/history'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'chat'] });
    },
  });
}

export function useCreateTicket() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description: string }) =>
      api.post<SupportTicket>('/support/tickets', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useMyTickets() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: () => api.get<SupportTicket[]>('/support/tickets'),
  });
}

export function useAdminTickets() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['support', 'admin', 'tickets'],
    queryFn: () => api.get<SupportTicket[]>('/support/admin/tickets'),
  });
}

export function useUpdateTicketStatus() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch<SupportTicket>(`/support/admin/tickets/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'admin', 'tickets'] });
    },
  });
}

export function useReopenTicket() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.post<SupportTicket>(`/support/tickets/${id}/reopen`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useTicketNotes(ticketId: number | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ['support', 'tickets', ticketId, 'notes'],
    queryFn: () => api.get<TicketNote[]>(`/support/tickets/${ticketId}/notes`),
    enabled: ticketId != null,
  });
}
