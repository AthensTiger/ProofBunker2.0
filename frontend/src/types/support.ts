export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  cdn_url: string;
  filename: string;
  file_size: number | null;
  created_at: string;
}

export interface TicketQuestionAttachment {
  id: number;
  question_id: number;
  cdn_url: string;
  filename: string;
  file_size: number | null;
  created_at: string;
}

export interface TicketQuestion {
  id: number;
  ticket_id: number;
  admin_id: number;
  admin_email: string;
  question: string;
  question_sent_at: string;
  response: string | null;
  response_received_at: string | null;
  response_attachments: TicketQuestionAttachment[];
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
  attachments: TicketAttachment[];
}

export interface TicketNote {
  id: number;
  ticket_id: number;
  user_id: number;
  note: string;
  note_type: 'reopen' | 'admin';
  created_at: string;
}
