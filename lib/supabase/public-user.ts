import type { UserGender } from "@/lib/enums/user-gender";

/** Row shape for `public.users` (see supabase/migrations). */
export type PublicUserRow = {
  id: string;
  auth_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  /** Postgres enum `public.user_gender`. */
  gender: UserGender;
  /** ISO date `YYYY-MM-DD` or null */
  date_of_birth: string | null;
  /** First auth provider at sign-up (`auth.identities.provider`: email, google, …). */
  signup_provider: string;
  created_at: string;
  updated_at: string;
};
