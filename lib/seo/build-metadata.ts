/**
 * Single source for `generateMetadata` outputs across the storefront.
 *
 * Resolution order for every field:
 *   1. Per-page override row in `public.seo_meta` (admin-edited).
 *   2. Computed from the page subject (product/collection/policy/route inputs).
 *   3. Site identity (`store_settings`) defaults.
 *   4. Hard fallback (generic copy).
 */

import type { Metadata } from "next";
import { absoluteUrl, canonicalUrlFor, hasIndexBlockingParams } from "./canonical";
import {
  clampSeoDescription,
  clampSeoTitle,
  stripHtml,
  suffixTitle,
} from "./text";
import type { SeoImage, SeoOverride, SiteIdentity } from "./types";

export type BuildMetadataInput = {
  pathname: string;
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams | null;

  identity: SiteIdentity;
  override: SeoOverride | null;

  /** Computed defaults from the underlying entity / route. */
  defaults: {
    /** Already-localized page name (no site suffix). */
    title: string;
    /** Plain text or HTML; HTML is stripped. */
    description: string;
    /** Falls back to identity.defaultOgImageUrl if empty. */
    images?: SeoImage[];
    keywords?: string[];
    /** When true (e.g. /search, /cart, /checkout), force noindex regardless of params. */
    forceNoindex?: boolean;
    /**
     * `og:type`. PDPs may use 'website' (Google ignores 'product' anyway and 'website'
     * is broadly compatible).
     */
    ogType?: "website" | "article";
  };
};

const DEFAULT_OG_DIMENSIONS = { width: 1200, height: 630 };

function pickOgImages(input: BuildMetadataInput): SeoImage[] {
  const out: SeoImage[] = [];
  const overrideUrl = input.override?.ogImageUrl?.trim();
  if (overrideUrl) {
    out.push({
      url: absoluteUrl(overrideUrl),
      alt: input.override?.ogImageAlt?.trim() || input.defaults.title,
      width: input.override?.ogImageWidth ?? DEFAULT_OG_DIMENSIONS.width,
      height: input.override?.ogImageHeight ?? DEFAULT_OG_DIMENSIONS.height,
    });
  }
  for (const img of input.defaults.images ?? []) {
    const u = (img.url ?? "").trim();
    if (!u) continue;
    out.push({
      url: absoluteUrl(u),
      alt: (img.alt ?? "").trim() || input.defaults.title,
      width: img.width ?? DEFAULT_OG_DIMENSIONS.width,
      height: img.height ?? DEFAULT_OG_DIMENSIONS.height,
    });
  }
  const fallback = input.identity.defaultOgImageUrl?.trim();
  if (out.length === 0 && fallback) {
    out.push({
      url: absoluteUrl(fallback),
      alt: input.identity.defaultOgImageAlt || input.identity.siteTitle || "Store",
      ...DEFAULT_OG_DIMENSIONS,
    });
  }
  // Deduplicate by URL while preserving order.
  const seen = new Set<string>();
  return out.filter((img) => {
    if (!img.url || seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
}

export function buildPageMetadata(input: BuildMetadataInput): Metadata {
  const { identity, defaults, override } = input;
  const site = identity.siteTitle.trim() || identity.storeName.trim() || "Store";
  const overrideTitle = override?.title.trim();
  const overrideDescription = override?.description.trim();

  const baseTitle = overrideTitle || defaults.title;
  const titleFinal = clampSeoTitle(suffixTitle(baseTitle, site));

  const descSource =
    overrideDescription ||
    stripHtml(defaults.description) ||
    identity.siteDescription ||
    "";
  const descFinal = clampSeoDescription(descSource) || undefined;

  const images = pickOgImages(input);
  const canonical =
    override?.canonicalUrl?.trim() || canonicalUrlFor(input.pathname, input.searchParams);

  const noindex =
    Boolean(defaults.forceNoindex) ||
    Boolean(override?.noindex) ||
    hasIndexBlockingParams(input.pathname, input.searchParams);
  const nofollow = Boolean(override?.nofollow);

  const keywords = (override?.keywords?.length ? override.keywords : defaults.keywords) ?? [];
  const twitterCard = override?.twitterCard ?? "summary_large_image";

  const meta: Metadata = {
    title: titleFinal,
    description: descFinal,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical },
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: defaults.ogType ?? "website",
      url: canonical,
      siteName: site,
      title: titleFinal,
      description: descFinal,
      locale: identity.locale || "en_US",
      images: images.length ? images : undefined,
    },
    twitter: {
      card: twitterCard,
      title: titleFinal,
      description: descFinal,
      images: images.length ? images.map((i) => i.url) : undefined,
      site: identity.twitterHandle || undefined,
      creator: identity.twitterHandle || undefined,
    },
    other: identity.facebookAppId ? { "fb:app_id": identity.facebookAppId } : undefined,
  };

  return meta;
}
