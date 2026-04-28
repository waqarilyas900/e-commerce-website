import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  dbListActiveHomePageSectionsWithTags,
  dbListAllActiveProductsForCards,
  dbListCollections,
} from "@/app/lib/db/catalog";
import { dbListPolicySummaries } from "@/app/lib/policy-pages-db";
import { createClient } from "@/lib/supabase/server";

/**
 * Always render at request time. Pre-rendering the sitemap at build time can
 * fail when Supabase isn't reachable from the Vercel build sandbox, and a
 * 1-hour cache window keeps Googlebot from hammering Postgres on every fetch
 * while still propagating new products within an SEO-acceptable freshness
 * window.
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const defaultModified = () => new Date();

type ProductTimestampRow = { slug: string; updated_at: string | null; created_at: string | null };
type CollectionTimestampRow = { slug: string; updated_at: string | null };

/**
 * Slug guard for sitemap loc-paths: rejects any string with whitespace, control
 * characters, or characters that would corrupt XML even after percent-encoding.
 * Bad inputs from the admin (paste from Word/Excel, accidental newline, etc.)
 * have been the recurring source of "Sitemap parse error" in Search Console.
 */
function safeSlug(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  // No whitespace, no control chars, no XML-meta chars in raw slug.
  if (/[\s\u0000-\u001f\u007f<>"'`]/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Image URL guard for the `<image:loc>` extension. Must:
 *  - Parse as a real http(s) URL (no `data:`, `javascript:`, etc.)
 *  - Have no whitespace, control chars, or XML-meta chars
 *  - Resolve to an absolute URL we can safely embed
 *
 * Returns the cleaned absolute URL or `null` to skip.
 */
function safeImageUrl(raw: string | null | undefined, base: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (/[\s\u0000-\u001f\u007f]/.test(trimmed)) return null;

  let absolute: string;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    absolute = trimmed;
  } else if (trimmed.startsWith("/")) {
    absolute = `${base}${trimmed}`;
  } else {
    absolute = `${base}/${trimmed}`;
  }

  try {
    const u = new URL(absolute);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Best-effort `updated_at` per product. Falls back to `created_at` then "now".
 * Done as a separate query so we keep the lighter `dbListAllActiveProductsForCards`
 * for the listing page.
 */
async function fetchProductTimestamps(): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (!hasCatalogDb()) return map;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at, created_at")
      .eq("status", "active");
    if (error || !data) return map;
    for (const r of data as ProductTimestampRow[]) {
      const ts = r.updated_at ?? r.created_at;
      if (r.slug && ts) map.set(r.slug, new Date(ts));
    }
  } catch {
    /* graceful fallback */
  }
  return map;
}

async function fetchCollectionTimestamps(): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (!hasCatalogDb()) return map;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collections")
      .select("slug, updated_at");
    if (error || !data) return map;
    for (const r of data as CollectionTimestampRow[]) {
      if (r.slug && r.updated_at) map.set(r.slug, new Date(r.updated_at));
    }
  } catch {
    /* graceful fallback */
  }
  return map;
}

/** Public storefront routes only (no account, checkout, or auth). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicSiteUrl();
  const lastModified = defaultModified();

  const entry = (
    path: string,
    opts?: { changeFrequency?: MetadataRoute.Sitemap[0]["changeFrequency"]; priority?: number },
  ): MetadataRoute.Sitemap[0] => ({
    url: `${base}${path.startsWith("/") ? path : `/${path}`}`,
    lastModified,
    changeFrequency: opts?.changeFrequency ?? "weekly",
    priority: opts?.priority ?? 0.6,
  });

  const staticPaths: MetadataRoute.Sitemap = [
    entry("/", { changeFrequency: "daily", priority: 1 }),
    entry("/collections", { changeFrequency: "daily", priority: 0.95 }),
    entry("/collections/sale", { changeFrequency: "daily", priority: 0.85 }),
    entry("/bundles", { changeFrequency: "weekly", priority: 0.75 }),
    entry("/contact", { changeFrequency: "monthly", priority: 0.5 }),
    entry("/policies", { changeFrequency: "monthly", priority: 0.45 }),
  ];

  if (!hasCatalogDb()) {
    return staticPaths;
  }

  // Defensive fetch: if any catalog query throws (schema drift, RLS, network),
  // we still return at least the curated `staticPaths` so the route never
  // 500s. Google Search Console rejects sitemaps that respond with 500
  // ("Invalid sitemap address") and stops retrying for hours, so degraded
  // output here is a much smaller SEO penalty than total absence.
  let products: Awaited<ReturnType<typeof dbListAllActiveProductsForCards>> = [];
  let collections: Awaited<ReturnType<typeof dbListCollections>> = [];
  let policies: Awaited<ReturnType<typeof dbListPolicySummaries>> = [];
  let homeSections: Awaited<ReturnType<typeof dbListActiveHomePageSectionsWithTags>> = [];
  let productTs = new Map<string, Date>();
  let collectionTs = new Map<string, Date>();

  try {
    [products, collections, policies, homeSections, productTs, collectionTs] =
      await Promise.all([
        dbListAllActiveProductsForCards(),
        dbListCollections(),
        dbListPolicySummaries(),
        dbListActiveHomePageSectionsWithTags(),
        fetchProductTimestamps(),
        fetchCollectionTimestamps(),
      ]);
  } catch (err) {
    console.error("[sitemap] dynamic fetch failed, returning static paths:", err);
    return staticPaths;
  }

  const byUrl = new Map<string, MetadataRoute.Sitemap[0]>();
  for (const e of staticPaths) {
    byUrl.set(e.url, e);
  }

  let skippedProducts = 0;
  let skippedImages = 0;
  let skippedCollections = 0;
  let skippedPolicies = 0;
  let skippedSections = 0;

  for (const p of products) {
    const slug = safeSlug(p.slug);
    if (!slug) {
      skippedProducts += 1;
      continue;
    }
    const url = `${base}/products/${encodeURIComponent(slug)}`;
    const lastMod =
      productTs.get(slug) ?? (p.createdAt ? new Date(p.createdAt) : lastModified);
    const entryItem: MetadataRoute.Sitemap[0] = {
      url,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.85,
    };
    const safeImage = safeImageUrl(p.image, base);
    if (safeImage) {
      // `images` is consumed by the Google Image extension to the sitemap protocol.
      // Skip image silently if the URL is malformed — better than emitting bad XML.
      (entryItem as MetadataRoute.Sitemap[0] & { images?: string[] }).images = [safeImage];
    } else if (p.image) {
      skippedImages += 1;
    }
    byUrl.set(url, entryItem);
  }

  for (const c of collections) {
    const slug = safeSlug(c.slug);
    if (!slug) {
      skippedCollections += 1;
      continue;
    }
    const url = `${base}/collections/${encodeURIComponent(slug)}`;
    byUrl.set(url, {
      url,
      lastModified: collectionTs.get(slug) ?? lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const pol of policies) {
    const slug = safeSlug(pol.slug);
    if (!slug) {
      skippedPolicies += 1;
      continue;
    }
    const url = `${base}/${encodeURIComponent(slug)}`;
    byUrl.set(url, {
      url,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.35,
    });
  }

  for (const s of homeSections) {
    const slug = safeSlug(s.slug);
    if (!slug) {
      skippedSections += 1;
      continue;
    }
    const url = `${base}/s/${encodeURIComponent(slug)}`;
    byUrl.set(url, {
      url,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  if (
    skippedProducts ||
    skippedImages ||
    skippedCollections ||
    skippedPolicies ||
    skippedSections
  ) {
    console.warn(
      "[sitemap] skipped invalid entries:",
      JSON.stringify({
        skippedProducts,
        skippedImages,
        skippedCollections,
        skippedPolicies,
        skippedSections,
      }),
    );
  }

  return [...byUrl.values()];
}
