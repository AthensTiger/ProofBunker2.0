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
  created_at: Date;
  updated_at: Date;
}

// Extend Express Request to include our user record
declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}
