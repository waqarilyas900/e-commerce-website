/**
 * Tenant identity for SEO. Reads from focused, single-purpose tables:
 *
 *   public.seo_site                          → identity, NAP, default OG, locale
 *   public.seo_social_profiles               → sameAs[] + primary Twitter/Facebook
 *   public.seo_search_engine_verifications   → verification meta tags
 *
 * Each loader degrades gracefully when the SEO migration hasn't been applied
 * (queries silently return defaults).
 *
 * Implementation note: this module re-exports the tag-revalidated loader from
 * `@/lib/cache/layout-data` so the same DB result is shared across every
 * `generateMetadata`, breadcrumb, and JSON-LD call within a render and across
 * navigations until the cache tag is busted by `/api/revalidate`. The actual
 * Supabase reads now live in `_loadSiteIdentity` over there using a cookie-free
 * client (the only kind that can run inside `unstable_cache`).
 */

import { getCachedSiteIdentity } from "@/lib/cache/layout-data";
import { applyEnvToSiteIdentity } from "@/lib/site-brand-env";
import type { SiteIdentity } from "./types";

export async function loadSiteIdentity(): Promise<SiteIdentity> {
  const identity = await getCachedSiteIdentity();
  return applyEnvToSiteIdentity(identity);
}
