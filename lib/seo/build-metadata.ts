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
import {
  absoluteUrl,
  canonicalUrlFor,
  hasIndexBlockingParams,
  resolveSeoCanonicalOverride,
} from "./canonical";
import {
  clampSeoDescription,
  clampSeoTitle,
  stripHtml,
  suffixTitle,
} from "./text";
import { resolveMetadataBaseTitle } from "./page-titles";
import type { SeoImage, SeoOverride, SiteIdentity } from "./types";
import { resolveSiteName } from "@/lib/site-brand-env";
import { getPublicSiteUrl } from "@/lib/site-url";

/**
 * Open Graph image with the full set of fields that Facebook / Slack / WhatsApp
 * scrapers consume. We always emit `type` (MIME) and `secureUrl` so the scraper
 * can validate the image without downloading it.
 */
type OgImageObject = {
  url: string;
  secureUrl?: string;
  type?: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Facebook product OG extension (also consumed by Pinterest Rich Pins and many
 * commerce crawlers). Emitted alongside `og:type=website` since FB's product
 * scraper accepts the prefixed `product:*` properties regardless of og:type.
 */
export type ProductOpenGraphExtras = {
  /** Numeric price in store currency. */
  priceAmount?: number | string | null;
  /** ISO-4217 currency code (e.g. "PKR"). */
  priceCurrency?: string | null;
  /** "instock" | "oos" | "preorder" | "discontinued" — FB taxonomy. */
  availability?: "instock" | "oos" | "preorder" | "discontinued" | null;
  /** "new" | "refurbished" | "used". */
  condition?: "new" | "refurbished" | "used" | null;
  /** Merchant SKU / GTIN — used for catalog matching. */
  retailerItemId?: string | null;
  /** Brand name string (NOT a URL). */
  brand?: string | null;
  /** Optional GTIN (UPC/EAN/ISBN). FB & Pinterest read this. */
  gtin?: string | null;
};

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
    /**
     * ISO-8601 timestamp of the last edit. Emitted as `og:updated_time` and
     * (when ogType = "article") `article:modified_time`.
     */
    lastModifiedISO?: string | null;
    /** ISO-8601 timestamp the content was first published. Article only. */
    publishedISO?: string | null;
    /** Article author name(s) — emitted as `article:author`. Article only. */
    authors?: string[];
    /** Article section / topic tag (e.g. "Policies"). Article only. */
    section?: string | null;
    /** Article subject tags. Article only. */
    articleTags?: string[];
    /**
     * When set, emit Facebook Product extension OG tags (`product:price:amount`,
     * etc). Works alongside `og:type=website` — FB's catalog scraper reads the
     * prefixed properties either way.
     */
    productExtras?: ProductOpenGraphExtras | null;
  };
};

const DEFAULT_OG_DIMENSIONS = { width: 1200, height: 630 };

function ogImageMimeFromUrl(url: string): string | undefined {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".avif")) return "image/avif";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return undefined;
}

function pickOgImages(input: BuildMetadataInput): OgImageObject[] {
  const out: OgImageObject[] = [];
  const overrideUrl = input.override?.ogImageUrl?.trim();
  if (overrideUrl) {
    const url = absoluteUrl(overrideUrl);
    out.push({
      url,
      secureUrl: url.startsWith("https://") ? url : undefined,
      type: ogImageMimeFromUrl(url),
      alt: input.override?.ogImageAlt?.trim() || input.defaults.title,
      width: input.override?.ogImageWidth ?? DEFAULT_OG_DIMENSIONS.width,
      height: input.override?.ogImageHeight ?? DEFAULT_OG_DIMENSIONS.height,
    });
  }
  for (const img of input.defaults.images ?? []) {
    const u = (img.url ?? "").trim();
    if (!u) continue;
    const url = absoluteUrl(u);
    out.push({
      url,
      secureUrl: url.startsWith("https://") ? url : undefined,
      type: ogImageMimeFromUrl(url),
      alt: (img.alt ?? "").trim() || input.defaults.title,
      width: img.width ?? DEFAULT_OG_DIMENSIONS.width,
      height: img.height ?? DEFAULT_OG_DIMENSIONS.height,
    });
  }
  const fallback = input.identity.defaultOgImageUrl?.trim();
  if (out.length === 0 && fallback) {
    const url = absoluteUrl(fallback);
    out.push({
      url,
      secureUrl: url.startsWith("https://") ? url : undefined,
      type: ogImageMimeFromUrl(url),
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

/**
 * Pull the host from `NEXT_PUBLIC_SITE_URL` for `twitter:domain` (Twitter ranks
 * cards higher when a verified domain is present).
 */
function siteDomain(): string | undefined {
  try {
    return new URL(getPublicSiteUrl()).hostname;
  } catch {
    return undefined;
  }
}

function appendOther(
  bag: Record<string, string | number | (string | number)[]>,
  key: string,
  value: string | number | undefined | null,
): void {
  if (value == null) return;
  if (typeof value === "string" && !value.trim()) return;
  bag[key] = typeof value === "string" ? value.trim() : value;
}

/**
 * Build the `other:` map (raw additional `<meta>` tags) for the page. Captures:
 *  - Facebook product extension (`product:price:amount`, etc).
 *  - `og:updated_time` for content-freshness signals.
 *  - `twitter:domain` for verified Twitter cards.
 *  - `fb:app_id` from identity (when configured).
 */
function buildOtherMeta(
  input: BuildMetadataInput,
): Record<string, string | number | (string | number)[]> | undefined {
  const other: Record<string, string | number | (string | number)[]> = {};
  const { identity, defaults } = input;

  if (identity.facebookAppId) {
    other["fb:app_id"] = identity.facebookAppId;
  }

  const domain = siteDomain();
  if (domain) {
    other["twitter:domain"] = domain;
  }

  if (defaults.lastModifiedISO) {
    other["og:updated_time"] = defaults.lastModifiedISO;
  }

  if (defaults.ogType === "article") {
    if (defaults.publishedISO) {
      other["article:published_time"] = defaults.publishedISO;
    }
    if (defaults.lastModifiedISO) {
      other["article:modified_time"] = defaults.lastModifiedISO;
    }
    if (defaults.section) {
      other["article:section"] = defaults.section;
    }
    if (defaults.authors?.length) {
      other["article:author"] = defaults.authors.filter(Boolean);
    }
    if (defaults.articleTags?.length) {
      other["article:tag"] = defaults.articleTags.filter(Boolean);
    }
  }

  const extras = defaults.productExtras;
  if (extras) {
    if (extras.priceAmount != null && extras.priceAmount !== "") {
      const n = Number(extras.priceAmount);
      if (Number.isFinite(n)) {
        appendOther(other, "product:price:amount", n.toFixed(2));
      }
    }
    appendOther(other, "product:price:currency", extras.priceCurrency);
    appendOther(other, "product:availability", extras.availability);
    appendOther(other, "product:condition", extras.condition);
    appendOther(other, "product:retailer_item_id", extras.retailerItemId);
    appendOther(other, "product:brand", extras.brand);
    if (extras.gtin) {
      // Pinterest reads `og:product:gtin` and FB reads `product:gtin`; emit both
      // so we cover the major commerce scrapers.
      appendOther(other, "product:gtin", extras.gtin);
      appendOther(other, "og:product:gtin", extras.gtin);
    }
  }

  return Object.keys(other).length ? other : undefined;
}

export function buildPageMetadata(input: BuildMetadataInput): Metadata {
  const { identity, defaults, override } = input;
  const site = resolveSiteName(identity.siteTitle, identity.storeName);
  const overrideTitle = override?.title.trim();
  const overrideDescription = override?.description.trim();

  const baseTitle = resolveMetadataBaseTitle(overrideTitle, defaults.title, site);
  const titleFinal = clampSeoTitle(suffixTitle(baseTitle, site));

  const descSource =
    overrideDescription ||
    stripHtml(defaults.description) ||
    identity.siteDescription ||
    "";
  const descFinal = clampSeoDescription(descSource) || undefined;

  const images = pickOgImages(input);
  const computedCanonical = canonicalUrlFor(input.pathname, input.searchParams);
  const canonical = resolveSeoCanonicalOverride(override?.canonicalUrl, computedCanonical);

  const noindex =
    Boolean(defaults.forceNoindex) ||
    Boolean(override?.noindex) ||
    hasIndexBlockingParams(input.pathname, input.searchParams);
  const nofollow = Boolean(override?.nofollow);

  const keywords = (override?.keywords?.length ? override.keywords : defaults.keywords) ?? [];
  const twitterCard = override?.twitterCard ?? "summary_large_image";

  // Twitter accepts full image objects with `alt` — emit them so cards include
  // `twitter:image:alt` (a11y + Twitter Card validator score).
  const twitterImages = images.length
    ? images.map((i) => ({
        url: i.url,
        alt: i.alt,
        width: i.width,
        height: i.height,
      }))
    : undefined;

  const meta: Metadata = {
    // Absolute so root `title.template` (`%s | site`) does not double-suffix —
    // we already apply `suffixTitle` above.
    title: { absolute: titleFinal },
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
      locale: identity.locale || "en_PK",
      images: images.length ? images : undefined,
    },
    twitter: {
      card: twitterCard,
      title: titleFinal,
      description: descFinal,
      images: twitterImages,
      site: identity.twitterHandle || undefined,
      creator: identity.twitterHandle || undefined,
    },
    other: buildOtherMeta(input),
  };

  return meta;
}
