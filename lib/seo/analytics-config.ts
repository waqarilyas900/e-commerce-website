/**
 * Analytics & pixel IDs from `public.seo_analytics` (singleton row id = 1).
 * Falls back to the legacy env var `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` when the
 * SEO migration has not been applied.
 *
 * Implementation note: delegates to the layout-cache layer so GTM/GA IDs are
 * fetched once per `LAYOUT_CACHE_TAGS.analytics` window and shared across
 * every navigation. Admin edits should call `/api/revalidate` with
 * `{ all: true }` (or `tag: "layout:analytics"`) to evict eagerly.
 */

import { getCachedAnalyticsConfig } from "@/lib/cache/layout-data";

export type AnalyticsConfig = {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  metaPixelId: string;
  tiktokPixelId: string;
  consentRequired: boolean;
};

export async function loadAnalyticsConfig(): Promise<AnalyticsConfig> {
  return getCachedAnalyticsConfig();
}
