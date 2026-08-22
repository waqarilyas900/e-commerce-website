import { cache } from "react";
import type { Product } from "@/app/lib/catalog/types";
import {
  getCachedActiveHomePageSectionsWithTags,
  getCachedAllActiveProductsForCards,
  getCachedProductsByCollectionSlug,
  getCachedProductsBySlugs,
  getCachedProductsForHomeSectionTags,
} from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { dbGetHomeRailsConfig } from "@/app/lib/home-rails-from-db";
import type { HomeCategoryRail } from "@/app/lib/store-brand.types";

export type HomeRailSection = HomeCategoryRail & {
  items: Product[];
  /** Total products in the linked collection (or sale filter), not just the rail preview. */
  totalProductCount: number;
};

/** Must match `RAIL_PREVIEW` in ProductSection — home shows this many cards per category. */
const HOME_RAIL_PREVIEW = 4;
/** Cap curated + fill so we don't over-fetch; UI still previews 4. */
const MAX_RAIL_PRODUCTS = 8;

function parseCollectionSlugFromHref(href: string): string | null {
  const m = href.trim().match(/^\/collections\/([^/?#]+)\/?$/);
  return m?.[1] ?? null;
}

function isRatedProduct(p: Product): boolean {
  return (p.rating ?? 0) > 0 || (p.reviews ?? 0) > 0;
}

/** Among rated products: highest rating first, then most reviews (descending). */
function compareRatedDescending(a: Product, b: Product): number {
  const byRating = (b.rating ?? 0) - (a.rating ?? 0);
  if (byRating !== 0) return byRating;
  const byReviews = (b.reviews ?? 0) - (a.reviews ?? 0);
  if (byReviews !== 0) return byReviews;
  return a.name.localeCompare(b.name);
}

/**
 * Per category: all rated products first (rating desc), then unrated fill.
 * Example: 3 rated + many unrated → order is [R1, R2, R3, U1, U2, ...] so the
 * 4-card grid shows 3 rated + 1 unrated.
 */
export function orderRatedThenUnrated(products: Product[]): Product[] {
  const rated: Product[] = [];
  const unrated: Product[] = [];
  for (const p of products) {
    if (isRatedProduct(p)) rated.push(p);
    else unrated.push(p);
  }
  rated.sort(compareRatedDescending);
  unrated.sort((a, b) => a.name.localeCompare(b.name));
  return [...rated, ...unrated];
}

async function getTotalProductsForViewAllHref(viewAllHref: string): Promise<number> {
  const slug = parseCollectionSlugFromHref(viewAllHref);
  if (!slug) return 0;

  if (slug === "sale") {
    if (!hasCatalogDb()) return 0;
    const all = await getCachedAllActiveProductsForCards();
    return all.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price).length;
  }

  if (!hasCatalogDb()) return 0;
  const list = await getCachedProductsByCollectionSlug(slug);
  return list.length;
}

/**
 * Resolve rail products from curated slugs, then backfill from the linked collection
 * when slugs are stale. Skips products already shown on an earlier homepage rail
 * so Kitchen / Appliances (etc.) never repeat the same card image.
 */
async function resolveRailProducts(
  rail: HomeCategoryRail,
  usedProductIds: Set<string>,
): Promise<{ items: Product[]; productSlugs: string[] }> {
  const curated = await getCachedProductsBySlugs(rail.productSlugs);
  const pool: Product[] = [];
  const seen = new Set<string>();
  const pushPool = (list: Product[]) => {
    for (const p of list) {
      if (usedProductIds.has(p.id) || seen.has(p.id)) continue;
      seen.add(p.id);
      pool.push(p);
    }
  };

  pushPool(curated);

  if (pool.length < HOME_RAIL_PREVIEW) {
    const collectionSlug = parseCollectionSlugFromHref(rail.viewAllHref);
    if (collectionSlug && collectionSlug !== "sale") {
      pushPool(await getCachedProductsByCollectionSlug(collectionSlug));
    }
  }

  const items = orderRatedThenUnrated(pool).slice(0, MAX_RAIL_PRODUCTS);
  for (const p of items.slice(0, HOME_RAIL_PREVIEW)) {
    usedProductIds.add(p.id);
  }

  return {
    items,
    productSlugs: items.map((p) => p.slug),
  };
}

async function loadHomeRails(): Promise<HomeRailSection[]> {
  if (!hasCatalogDb()) {
    return [];
  }

  const configuredSections = await getCachedActiveHomePageSectionsWithTags();
  const sectionsWithTags = configuredSections.filter((s) => s.tagIds.length > 0);
  if (sectionsWithTags.length > 0) {
    const usedProductIds = new Set<string>();
    const out: HomeRailSection[] = [];
    for (const s of sectionsWithTags) {
      const raw = await getCachedProductsForHomeSectionTags(s.tagIds, s.slug);
      // This category only — drop cards already shown on an earlier rail.
      const available = raw.filter((p) => !usedProductIds.has(p.id));
      // Rated first (desc), then unrated fill so the 4-card preview stays full.
      const items = orderRatedThenUnrated(available);
      for (const p of items.slice(0, HOME_RAIL_PREVIEW)) {
        usedProductIds.add(p.id);
      }
      const rail: HomeCategoryRail = {
        title: s.name,
        viewAllHref: `/s/${s.slug}`,
        productSlugs: items.map((p) => p.slug),
      };
      out.push({ ...rail, items, totalProductCount: raw.length });
    }
    return out;
  }

  const rails = await dbGetHomeRailsConfig();
  if (rails.length === 0) {
    return [];
  }

  const usedProductIds = new Set<string>();
  const out: HomeRailSection[] = [];
  for (const rail of rails) {
    const totalProductCount = await getTotalProductsForViewAllHref(rail.viewAllHref);
    const { items, productSlugs } = await resolveRailProducts(rail, usedProductIds);
    out.push({ ...rail, productSlugs, items, totalProductCount });
  }
  return out;
}

/** Dedupes within a single request if home data is needed more than once. */
export const getHomeRailSections = cache(loadHomeRails);
