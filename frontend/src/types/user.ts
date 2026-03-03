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
  created_at: string;
  updated_at: string;
}
