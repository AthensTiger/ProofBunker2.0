export interface Conversation {
  id: number;
  user_ids: number[];
  last_message_at: string;
  created_at: string;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message_content: string | null;
  last_message_sender_id: number | null;
  unread_count: number;
}

export interface DirectMessage {
  id: number;
  sender_id: number;
  content: string;
  read_at: string | null;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
}

export interface Contact {
  id: number;
  name: string;
  avatar_url: string | null;
}
