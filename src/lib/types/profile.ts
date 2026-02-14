export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}
