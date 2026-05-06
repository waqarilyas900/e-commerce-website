/**
 * Analytics & pixel IDs from `public.seo_analytics` (singleton row id = 1),
 * edited in Admin → SEO → Analytics & pixels.
 *
 * GA4 only: when the DB field is empty, `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` is used
 * as a deploy-time fallback (optional).
 *
 * Implementation note: delegates to the layout-cache layer so GTM/GA/pixel IDs are
 * fetched once per `LAYOUT_CACHE_TAGS.analytics` window and shared across
 * every navigation. Admin saves should call `/api/revalidate` with
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
