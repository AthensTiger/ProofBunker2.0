export interface UserRecord {
  id: number;
  auth0_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'curator' | 'admin';
  age_verified: boolean;
  email_verified: boolean;
  preferences: Record<string, unknown>;
  features: { messages: boolean; posts: boolean };
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}
