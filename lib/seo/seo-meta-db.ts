/** Server-side reader for `public.seo_meta` overrides. Graceful when migration not applied. */

import { cache } from "react";
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

/**
 * Tries the storefront locale first, then common equivalents (`en` vs `en_US`),
 * so admin-saved rows match even when `seo_site.locale` and `seo_meta.locale` differ.
 */
function seoLocaleCandidates(hint?: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string | undefined | null) => {
    const t = (s ?? "").trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  add(hint);
  const h = (hint ?? "").trim();
  if (h.includes("_")) add(h.split("_")[0]);
  if (h.includes("-")) add(h.split("-")[0]);
  const norm = h.toLowerCase().replace(/-/g, "_");
  if (norm === "en_us") add("en");
  if (norm === "en") add("en_US");
  add("en");
  add("en_US");
  return out;
}

async function loadSeoOverrideForSubjectImpl(
  subjectType: Exclude<SeoSubjectType, "route" | "site_default">,
  subjectId: string,
  localeHint?: string | null,
): Promise<SeoOverride | null> {
  if (!hasCatalogDb()) return null;
  try {
    const supabase = await createClient();
    for (const loc of seoLocaleCandidates(localeHint)) {
      const { data, error } = await supabase
        .from("seo_meta")
        .select(SELECT_COLUMNS)
        .eq("subject_type", subjectType)
        .eq("subject_id", subjectId)
        .eq("locale", loc)
        .maybeSingle<SeoMetaRow>();
      if (error) {
        if (error.message?.includes("Could not find the table") || error.message?.includes("schema cache")) {
          warnMissing(error.message);
        }
        return null;
      }
      if (data) return rowToOverride(data);
    }
    return null;
  } catch (e) {
    warnMissing(String(e));
    return null;
  }
}

async function loadSeoOverrideForRouteImpl(
  subjectKey: string,
  localeHint?: string | null,
): Promise<SeoOverride | null> {
  if (!hasCatalogDb()) return null;
  try {
    const supabase = await createClient();
    for (const loc of seoLocaleCandidates(localeHint)) {
      const { data, error } = await supabase
        .from("seo_meta")
        .select(SELECT_COLUMNS)
        .eq("subject_type", "route")
        .eq("subject_key", subjectKey)
        .eq("locale", loc)
        .maybeSingle<SeoMetaRow>();
      if (error) {
        if (error.message?.includes("Could not find the table") || error.message?.includes("schema cache")) {
          warnMissing(error.message);
        }
        return null;
      }
      if (data) return rowToOverride(data);
    }
    return null;
  } catch (e) {
    warnMissing(String(e));
    return null;
  }
}

/** Fetch override for an entity row (`product`, `collection`, `policy_page`, ...). Cached per request. */
export const loadSeoOverrideForSubject = cache(loadSeoOverrideForSubjectImpl);

/** Fetch override for a static route (key like `/`, `/search`, `/contact`). Cached per request. */
export const loadSeoOverrideForRoute = cache(loadSeoOverrideForRouteImpl);

export function emptyOverrideFor(subjectType: SeoSubjectType): SeoOverride {
  return { subjectType, ...EMPTY_OVERRIDE };
}
