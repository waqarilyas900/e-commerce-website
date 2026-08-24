/**
 * Lookup `public.url_redirects` for a pathname (e.g. after a product slug change).
 * Uses the anon key — table is RLS-readable for active rows.
 */
export async function lookupUrlRedirect(
  pathname: string,
): Promise<{ toPath: string; statusCode: 301 | 302 | 410 } | null> {
  const path = pathname.trim();
  if (!path.startsWith("/")) return null;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return null;

  try {
    const qs = new URLSearchParams({
      select: "to_path,status_code",
      from_path: `eq.${path}`,
      is_active: "eq.true",
      limit: "1",
    });
    const res = await fetch(`${base}/rest/v1/url_redirects?${qs.toString()}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      // Short CDN/data cache — slug redirects change rarely; admin revalidate covers edits.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ to_path?: string; status_code?: number }>;
    const row = rows[0];
    if (!row?.to_path) return null;
    const code = row.status_code === 302 || row.status_code === 410 ? row.status_code : 301;
    return { toPath: row.to_path, statusCode: code };
  } catch {
    return null;
  }
}
