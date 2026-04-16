import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";
import type { Bundle } from "@/app/lib/catalog/types";

function parseBundles(raw: unknown): Bundle[] {
  if (!Array.isArray(raw)) return [];
  const out: Bundle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const slug = typeof o.slug === "string" ? o.slug.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!slug || !name) continue;
    const productSlugs = Array.isArray(o.productSlugs)
      ? o.productSlugs.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    out.push({
      slug,
      name,
      description: typeof o.description === "string" ? o.description : "",
      discountLabel: typeof o.discountLabel === "string" ? o.discountLabel : "",
      productSlugs,
      image: typeof o.image === "string" ? o.image : "",
    });
  }
  return out;
}

/** Bundle definitions from `home_page_settings.bundles` (JSON, edited via admin / SQL). */
export async function dbGetHomeBundles(): Promise<Bundle[]> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("home_page_settings")
      .select("bundles")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return [];
    return parseBundles(data.bundles);
  } catch {
    return [];
  }
}
