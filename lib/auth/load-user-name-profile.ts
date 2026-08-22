import type { UserNameProfile } from "@/lib/auth/user-display-name";
import { createClient } from "@/lib/supabase/client";

export async function loadUserNameProfile(authId: string): Promise<UserNameProfile | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("auth_id", authId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}
