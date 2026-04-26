/** Server-side reader for `public.seo_meta` overrides. Graceful when migration not applied. */

import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";
import type { SeoOverride, SeoSubjectType } from "./types";

const EMPTY_OVERRIDE: Omit<SeoOverride, "subjectType"> = {
  subjectId: null,
  subjectKey: null,
  locale: "en",
  title: "",
  description: "",
  keywords: [],
  canonicalUrl: "",
  ogImageUrl: "",
  ogImageAlt: "",
  ogImageWidth: null,
  ogImageHeight: null,
  twitterCard: "summary_large_image",
  noindex: false,
  nofollow: false,
  jsonLdOverrides: {},
};

/** Internal: shape of a row returned from `public.seo_meta`. */
type SeoMetaRow = {
  subject_type: string;
  subject_id: string | null;
  subject_key: string | null;
  locale: string;
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  canonical_url: string | null;
  og_image_url: string | null;
  og_image_alt: string | null;
  og_image_width: number | null;
  og_image_height: number | null;
  twitter_card: string | null;
  noindex: boolean | null;
  nofollow: boolean | null;
  json_ld_overrides: Record<string, unknown> | null;
};

let warnedMissing = false;
function warnMissing(reason: string) {
  if (warnedMissing) return;
  warnedMissing = true;
  console.warn(
    `[seo] public.seo_meta not available (${reason}). Falling back to computed metadata.`,
  );
}

const SELECT_COLUMNS =
  "subject_type, subject_id, subject_key, locale, title, description, keywords, canonical_url, og_image_url, og_image_alt, og_image_width, og_image_height, twitter_card, noindex, nofollow, json_ld_overrides";

function rowToOverride(row: SeoMetaRow): SeoOverride {
  const card = row.twitter_card === "summary" ? "summary" : "summary_large_image";
  return {
    subjectType: row.subject_type as SeoSubjectType,
    subjectId: row.subject_id,
    subjectKey: row.subject_key,
    locale: row.locale ?? "en",
    title: (row.title ?? "").trim(),
    description: (row.description ?? "").trim(),
    keywords: Array.isArray(row.keywords) ? row.keywords.filter((k) => typeof k === "string" && k.trim()) : [],
    canonicalUrl: (row.canonical_url ?? "").trim(),
    ogImageUrl: (row.og_image_url ?? "").trim(),
    ogImageAlt: (row.og_image_alt ?? "").trim(),
    ogImageWidth: row.og_image_width ?? null,
    ogImageHeight: row.og_image_height ?? null,
    twitterCard: card,
    noindex: Boolean(row.noindex),
    nofollow: Boolean(row.nofollow),
    jsonLdOverrides:
      row.json_ld_overrides && typeof row.json_ld_overrides === "object"
        ? (row.json_ld_overrides as Record<string, unknown>)
        : {},
  };
}

/** Fetch override for an entity row (`product`, `collection`, `policy_page`, ...). */
export async function loadSeoOverrideForSubject(
  subjectType: Exclude<SeoSubjectType, "route" | "site_default">,
  subjectId: string,
  locale = "en",
): Promise<SeoOverride | null> {
  if (!hasCatalogDb()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_meta")
      .select(SELECT_COLUMNS)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .eq("locale", locale)
      .maybeSingle<SeoMetaRow>();
    if (error) {
      if (error.message?.includes("Could not find the table") || error.message?.includes("schema cache")) {
        warnMissing(error.message);
      }
      return null;
    }
    return data ? rowToOverride(data) : null;
  } catch (e) {
    warnMissing(String(e));
    return null;
  }
}

/** Fetch override for a static route (key like `/`, `/search`, `/contact`, `site_default`). */
export async function loadSeoOverrideForRoute(
  subjectKey: string,
  locale = "en",
): Promise<SeoOverride | null> {
  if (!hasCatalogDb()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_meta")
      .select(SELECT_COLUMNS)
      .eq("subject_type", "route")
      .eq("subject_key", subjectKey)
      .eq("locale", locale)
      .maybeSingle<SeoMetaRow>();
    if (error) {
      if (error.message?.includes("Could not find the table") || error.message?.includes("schema cache")) {
        warnMissing(error.message);
      }
      return null;
    }
    return data ? rowToOverride(data) : null;
  } catch (e) {
    warnMissing(String(e));
    return null;
  }
}

export function emptyOverrideFor(subjectType: SeoSubjectType): SeoOverride {
  return { subjectType, ...EMPTY_OVERRIDE };
}
