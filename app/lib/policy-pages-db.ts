import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";

export type PolicySummary = { slug: string; title: string };

export async function dbListPolicySummaries(): Promise<PolicySummary[]> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("policy_pages")
      .select("slug, title, sort_order")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error || !data?.length) return [];
    return data.map((r) => ({
      slug: String(r.slug),
      title: String(r.title),
    }));
  } catch {
    return [];
  }
}

/**
 * Returns the policy page by slug. `id` and `updatedAt` are surfaced so the
 * storefront can both fetch a per-page SEO override (`seo_meta` keyed on the
 * policy id) and emit `dateModified` / `og:updated_time` for freshness
 * ranking signals.
 */
export async function dbGetPolicyPage(
  slug: string,
): Promise<{
  id: string;
  title: string;
  contentHtml: string;
  updatedAt: string | null;
} | null> {
  if (!hasCatalogDb()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("policy_pages")
      .select("id, title, content_html, updated_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as {
      id: string;
      title: string | null;
      content_html: string | null;
      updated_at: string | null;
    };
    return {
      id: row.id,
      title: String(row.title ?? ""),
      contentHtml: String(row.content_html ?? ""),
      updatedAt: row.updated_at ?? null,
    };
  } catch {
    return null;
  }
}
