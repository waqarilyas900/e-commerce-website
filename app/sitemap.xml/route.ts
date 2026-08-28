import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/site-url";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  dbListActiveHomePageSectionsWithTags,
  dbListAllActiveProductsForCards,
  dbListCollections,
} from "@/app/lib/db/catalog";
import { dbListPolicySummaries } from "@/app/lib/policy-pages-db";
import { STATIC_BLOG_GUIDES, STATIC_GUIDE_LISTING_HERO } from "@/app/lib/blog/guides";
import { createClient } from "@/lib/supabase/server";

/**
 * We hand-roll the XML instead of using Next's `MetadataRoute.Sitemap` /
 * `app/sitemap.ts` convention because:
 *
 *  1. The `images` extension we need (`<image:image><image:loc>` per
 *     https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
 *     is rendered by Next without reliable XML escaping for unsafe characters
 *     in supplier CDN URLs (raw `&` inside query strings was producing
 *     "EntityRef: expecting ';'" parse errors in Search Console).
 *  2. The route is dynamic + cached for an hour, so the perf cost of a
 *     custom builder is irrelevant.
 *  3. Hand-writing keeps escaping, sanitization, and skip-on-invalid logic
 *     in one place that we fully control.
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

type ProductTimestampRow = { slug: string; updated_at: string | null; created_at: string | null };
type CollectionTimestampRow = { slug: string; updated_at: string | null };

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  imageLoc?: string;
};

function safeDate(value: string | Date | null | undefined, fallback: Date): Date {
  const date = value instanceof Date ? value : new Date(value ?? "");
  return Number.isFinite(date.getTime()) ? date : fallback;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Reject slugs with whitespace, control chars, or chars that would corrupt
 * XML even after percent-encoding. Bad inputs from the admin (paste from
 * Word/Excel, accidental newline, etc.) have been the recurring source of
 * "Sitemap parse error" in Search Console.
 */
function safeSlug(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (/[\s\u0000-\u001f\u007f<>"'`]/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validate + normalize an image URL for `<image:loc>`. The `&` characters that
 * legitimately appear in CDN query strings are kept here and escaped at write
 * time by `xmlEscape`. We only drop URLs that aren't real http(s) links or
 * contain whitespace/control characters that would still break XML.
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
      const date = safeDate(ts, new Date(0));
      if (r.slug && ts && date.getTime() !== 0) map.set(r.slug, date);
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
      const date = safeDate(r.updated_at, new Date(0));
      if (r.slug && r.updated_at && date.getTime() !== 0) map.set(r.slug, date);
    }
  } catch {
    /* graceful fallback */
  }
  return map;
}

function renderXml(entries: SitemapEntry[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  );
  for (const e of entries) {
    const lastModified = safeDate(e.lastModified, new Date(0));
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(e.url)}</loc>`);
    lines.push(`    <lastmod>${xmlEscape(lastModified.toISOString())}</lastmod>`);
    lines.push(`    <changefreq>${xmlEscape(e.changeFrequency)}</changefreq>`);
    lines.push(`    <priority>${e.priority.toFixed(2)}</priority>`);
    if (e.imageLoc) {
      lines.push("    <image:image>");
      lines.push(`      <image:loc>${xmlEscape(e.imageLoc)}</image:loc>`);
      lines.push("    </image:image>");
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n");
}

export async function GET(): Promise<NextResponse> {
  const base = getPublicSiteUrl();
  const lastModified = new Date();

  const staticEntries: SitemapEntry[] = [
    { url: `${base}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${base}/collections`, lastModified, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/contact`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/how-to-buy`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/blogs`, lastModified, changeFrequency: "daily", priority: 0.75 },
    {
      url: `${base}/customer-reviews`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.75,
    },
    ...STATIC_BLOG_GUIDES.map((g) => ({
      url: `${base}/blogs/${encodeURIComponent(g.slug)}`,
      lastModified: safeDate(g.publishedAt, lastModified),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      imageLoc: safeImageUrl(STATIC_GUIDE_LISTING_HERO[g.slug], base) ?? undefined,
    })),
    {
      url: `${base}/purchase-protection`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${base}/terms`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/policies`, lastModified, changeFrequency: "monthly", priority: 0.45 },
  ];

  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  } as const;

  if (!hasCatalogDb()) {
    return new NextResponse(renderXml(staticEntries), { headers });
  }

  let products: Awaited<ReturnType<typeof dbListAllActiveProductsForCards>> = [];
  let collections: Awaited<ReturnType<typeof dbListCollections>> = [];
  let policies: Awaited<ReturnType<typeof dbListPolicySummaries>> = [];
  let homeSections: Awaited<ReturnType<typeof dbListActiveHomePageSectionsWithTags>> = [];
  let productTs = new Map<string, Date>();
  let collectionTs = new Map<string, Date>();

  const [
    productsResult,
    collectionsResult,
    policiesResult,
    homeSectionsResult,
    productTsResult,
    collectionTsResult,
  ] = await Promise.allSettled([
    dbListAllActiveProductsForCards(),
    dbListCollections(),
    dbListPolicySummaries(),
    dbListActiveHomePageSectionsWithTags(),
    fetchProductTimestamps(),
    fetchCollectionTimestamps(),
  ]);

  products = productsResult.status === "fulfilled" ? productsResult.value : [];
  collections = collectionsResult.status === "fulfilled" ? collectionsResult.value : [];
  policies = policiesResult.status === "fulfilled" ? policiesResult.value : [];
  homeSections = homeSectionsResult.status === "fulfilled" ? homeSectionsResult.value : [];
  productTs = productTsResult.status === "fulfilled" ? productTsResult.value : new Map();
  collectionTs =
    collectionTsResult.status === "fulfilled" ? collectionTsResult.value : new Map();

  const rejected = [
    productsResult,
    collectionsResult,
    policiesResult,
    homeSectionsResult,
    productTsResult,
    collectionTsResult,
  ].filter((result) => result.status === "rejected");
  if (rejected.length) {
    console.error(`[sitemap] ${rejected.length} dynamic source(s) failed; serving partial sitemap`);
  }

  const byUrl = new Map<string, SitemapEntry>();
  for (const e of staticEntries) {
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
    const lastMod = productTs.get(slug) ?? safeDate(p.createdAt, lastModified);
    const safeImage = safeImageUrl(p.image, base);
    if (!safeImage && p.image) skippedImages += 1;
    byUrl.set(url, {
      url,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.85,
      imageLoc: safeImage ?? undefined,
    });

    // Dedicated hands-on buying guide and review for every catalog item
    byUrl.set(`${base}/blogs/${encodeURIComponent(slug)}`, {
      url: `${base}/blogs/${encodeURIComponent(slug)}`,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.7,
      imageLoc: safeImage ?? undefined,
    });
  }

  for (const c of collections) {
    const slug = safeSlug(c.slug);
    if (!slug) {
      skippedCollections += 1;
      continue;
    }
    const url = `${base}/collections/${encodeURIComponent(slug)}`;
    const safeImage = safeImageUrl(c.hero_image, base);
    if (!safeImage && c.hero_image) skippedImages += 1;
    byUrl.set(url, {
      url,
      lastModified: collectionTs.get(slug) ?? lastModified,
      changeFrequency: "daily",
      priority: 0.8,
      imageLoc: safeImage ?? undefined,
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

  return new NextResponse(renderXml([...byUrl.values()]), { headers });
}
