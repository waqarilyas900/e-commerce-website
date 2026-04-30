import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";
import { getCachedStoreBrand } from "@/lib/cache/layout-data";
import type { StoreBrandConfig } from "./store-brand.types";

/**
 * Live storefront identity and marketing blocks from `store_settings`, `footer_settings`,
 * `home_page_settings`, and `policy_pages` (footer links).
 *
 * Implementation note: delegates to the tag-revalidated layout cache so every
 * Header / Footer / SEO call site shares the same in-process result. The
 * underlying SQL lives in `_loadStoreBrand` inside `lib/cache/layout-data.ts`
 * and uses a cookie-free Supabase client (required for `unstable_cache`).
 */
export async function loadStoreBrandFromDatabase(): Promise<StoreBrandConfig> {
  return getCachedStoreBrand();
}

const FALLBACK_DISPLAY_NAME = "Store";

/**
 * Short display name from `store_settings` only (emails, geocode User-Agent, etc.).
 * When the row is missing or both fields are empty, returns a generic label — not env.
 */
export async function getStoreDisplayNameFromDatabase(): Promise<string> {
  if (!hasCatalogDb()) {
    return FALLBACK_DISPLAY_NAME;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("store_settings")
      .select("store_name, site_title")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) {
      return FALLBACK_DISPLAY_NAME;
    }
    const name = (data.store_name ?? "").trim();
    if (name) return name;
    const title = (data.site_title ?? "").trim();
    if (title) return title;
    return FALLBACK_DISPLAY_NAME;
  } catch {
    return FALLBACK_DISPLAY_NAME;
  }
}
