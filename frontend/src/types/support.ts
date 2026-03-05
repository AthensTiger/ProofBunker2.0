export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  user_id: number;
  user_email: string;
  title: string;
  description: string;
  ticket_type: 'bug' | 'enhancement' | 'question' | 'other' | null;
  claude_analysis: string | null;
  claude_suggested_fix: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolved_at: string | null;
  auto_close_at: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketNote {
  id: number;
  ticket_id: number;
  user_id: number;
  note: string;
  note_type: 'reopen' | 'admin';
  created_at: string;
}
