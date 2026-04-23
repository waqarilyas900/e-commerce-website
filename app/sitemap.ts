import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  dbListActiveHomePageSectionsWithTags,
  dbListAllActiveProductsForCards,
  dbListCollections,
} from "@/app/lib/db/catalog";
import { dbListPolicySummaries } from "@/app/lib/policy-pages-db";

const defaultModified = () => new Date();

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
    entry("/search", { changeFrequency: "weekly", priority: 0.4 }),
  ];

  if (!hasCatalogDb()) {
    return staticPaths;
  }

  const [products, collections, policies, homeSections] = await Promise.all([
    dbListAllActiveProductsForCards(),
    dbListCollections(),
    dbListPolicySummaries(),
    dbListActiveHomePageSectionsWithTags(),
  ]);

  const byUrl = new Map<string, MetadataRoute.Sitemap[0]>();

  for (const e of staticPaths) {
    byUrl.set(e.url, e);
  }

  for (const p of products) {
    if (!p.slug) continue;
    const url = `${base}/products/${encodeURIComponent(p.slug)}`;
    byUrl.set(url, {
      url,
      lastModified: p.createdAt ? new Date(p.createdAt) : lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  for (const c of collections) {
    if (!c.slug) continue;
    const url = `${base}/collections/${encodeURIComponent(c.slug)}`;
    byUrl.set(url, {
      url,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const pol of policies) {
    if (!pol.slug) continue;
    const url = `${base}/policies/${encodeURIComponent(pol.slug)}`;
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
