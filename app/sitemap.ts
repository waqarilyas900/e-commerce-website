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

const defaultModified = () => new Date();

type ProductTimestampRow = { slug: string; updated_at: string | null; created_at: string | null };
type CollectionTimestampRow = { slug: string; updated_at: string | null };

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

  const [products, collections, policies, homeSections, productTs, collectionTs] =
    await Promise.all([
      dbListAllActiveProductsForCards(),
      dbListCollections(),
      dbListPolicySummaries(),
      dbListActiveHomePageSectionsWithTags(),
      fetchProductTimestamps(),
      fetchCollectionTimestamps(),
    ]);

  const byUrl = new Map<string, MetadataRoute.Sitemap[0]>();
  for (const e of staticPaths) {
    byUrl.set(e.url, e);
  }

  for (const p of products) {
    if (!p.slug) continue;
    const url = `${base}/products/${encodeURIComponent(p.slug)}`;
    const lastMod =
      productTs.get(p.slug) ?? (p.createdAt ? new Date(p.createdAt) : lastModified);
    const entryItem: MetadataRoute.Sitemap[0] = {
      url,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.85,
    };
    if (p.image) {
      // `images` is consumed by the Google Image extension to the sitemap protocol.
      (entryItem as MetadataRoute.Sitemap[0] & { images?: string[] }).images = [
        p.image.startsWith("http") ? p.image : `${base}${p.image.startsWith("/") ? p.image : `/${p.image}`}`,
      ];
    }
    byUrl.set(url, entryItem);
  }

  for (const c of collections) {
    if (!c.slug) continue;
    const url = `${base}/collections/${encodeURIComponent(c.slug)}`;
    byUrl.set(url, {
      url,
      lastModified: collectionTs.get(c.slug) ?? lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const pol of policies) {
    if (!pol.slug) continue;
    const url = `${base}/${encodeURIComponent(pol.slug)}`;
    byUrl.set(url, {
      url,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.35,
    });
  }

  for (const s of homeSections) {
    if (!s.slug) continue;
    const url = `${base}/s/${encodeURIComponent(s.slug)}`;
    byUrl.set(url, {
      url,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return [...byUrl.values()];
}
