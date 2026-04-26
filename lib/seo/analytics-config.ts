/**
 * Analytics & pixel IDs from `public.seo_analytics` (singleton row id = 1).
 * Falls back to the legacy env var `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` when the
 * SEO migration has not been applied.
 */

import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";

export type AnalyticsConfig = {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  metaPixelId: string;
  tiktokPixelId: string;
  consentRequired: boolean;
};

const EMPTY: AnalyticsConfig = {
  googleAnalyticsId: "",
  googleTagManagerId: "",
  metaPixelId: "",
  tiktokPixelId: "",
  consentRequired: false,
};

export async function loadAnalyticsConfig(): Promise<AnalyticsConfig> {
  const fallbackGa = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ?? "";
  if (!hasCatalogDb()) {
    return { ...EMPTY, googleAnalyticsId: fallbackGa };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_analytics")
      .select(
        "google_analytics_id, google_tag_manager_id, meta_pixel_id, tiktok_pixel_id, consent_required",
      )
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return { ...EMPTY, googleAnalyticsId: fallbackGa };
    const row = data as unknown as Record<string, unknown>;
    return {
      googleAnalyticsId: String(row.google_analytics_id ?? "").trim() || fallbackGa,
      googleTagManagerId: String(row.google_tag_manager_id ?? "").trim(),
      metaPixelId: String(row.meta_pixel_id ?? "").trim(),
      tiktokPixelId: String(row.tiktok_pixel_id ?? "").trim(),
      consentRequired: Boolean(row.consent_required),
    };
  } catch {
    return { ...EMPTY, googleAnalyticsId: fallbackGa };
  }
}
