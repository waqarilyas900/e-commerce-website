import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";
import type { HomeCategoryRail } from "@/app/lib/store-brand.types";

function parseRails(raw: unknown): HomeCategoryRail[] {
  if (!Array.isArray(raw)) return [];
  const out: HomeCategoryRail[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const viewAllHref = typeof o.viewAllHref === "string" ? o.viewAllHref.trim() : "";
    const productSlugs = Array.isArray(o.productSlugs)
      ? o.productSlugs.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    if (!title || !viewAllHref) continue;
    out.push({ title, viewAllHref, productSlugs });
  }
  return out;
}

export async function dbGetHomeRailsConfig(): Promise<HomeCategoryRail[]> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("home_page_settings")
      .select("home_rails")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return [];
    return parseRails(data.home_rails);
  } catch {
    return [];
  }
}
