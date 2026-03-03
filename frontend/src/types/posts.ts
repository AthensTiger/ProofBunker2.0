export interface UserPost {
  id: number;
  user_id: number;
  product_id: number | null;
  product_name: string | null;
  title: string;
  content: string;
  status: 'draft' | 'pending_approval' | 'published' | 'public';
  author_name?: string;
  last_decision?: 'approved' | 'rejected' | null;
  last_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostApproval {
  id: number;
  post_id: number;
  curator_id: number;
  decision: 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
}
