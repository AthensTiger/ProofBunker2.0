export interface ReleaseNote {
  id: number;
  title: string;
  body: string;
  type: 'bug_fix' | 'enhancement' | 'new_feature' | 'other';
  version: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReleaseNotesResponse {
  notes: ReleaseNote[];
  total: number;
}
