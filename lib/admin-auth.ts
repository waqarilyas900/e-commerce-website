import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Verify a Supabase JWT belongs to an active admin (same rules as /api/revalidate). */
export async function isActiveAdminJwt(jwt: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !jwt) return false;
  try {
    const sb = createSupabaseClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) return false;
    const { data: ok, error: rpcErr } = await sb.rpc("is_active_admin");
    if (rpcErr) return false;
    return ok === true;
  } catch {
    return false;
  }
}

export function authorizeAdminRequest(req: Request): Promise<boolean> {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  const providedSecret = req.headers.get("x-revalidate-secret")?.trim();
  if (secret && providedSecret && providedSecret === secret) {
    return Promise.resolve(true);
  }
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return Promise.resolve(false);
  }
  return isActiveAdminJwt(auth.slice(7).trim());
}
