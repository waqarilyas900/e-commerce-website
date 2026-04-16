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

export async function dbGetPolicyPage(
  slug: string,
): Promise<{ title: string; contentHtml: string } | null> {
  if (!hasCatalogDb()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("policy_pages")
      .select("title, content_html")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return {
      title: String(data.title ?? ""),
      contentHtml: String(data.content_html ?? ""),
    };
  } catch {
    return null;
  }
}
