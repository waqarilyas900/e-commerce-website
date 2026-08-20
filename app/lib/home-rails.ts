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

function parseCollectionSlugFromHref(href: string): string | null {
  const m = href.trim().match(/^\/collections\/([^/?#]+)\/?$/);
  return m?.[1] ?? null;
}

/** Prefer at least this many cards so homepage rails don't look empty after slug renames. */
const MIN_RAIL_PRODUCTS = 4;
/** Cap curated + fill so we don't over-fetch; UI still previews 4. */
const MAX_RAIL_PRODUCTS = 8;

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
  const merged: Product[] = [];
  const take = (list: Product[]) => {
    for (const p of list) {
      if (usedProductIds.has(p.id)) continue;
      usedProductIds.add(p.id);
      merged.push(p);
      if (merged.length >= MAX_RAIL_PRODUCTS) return;
    }
  };

  take(curated);

  if (merged.length < MIN_RAIL_PRODUCTS) {
    const collectionSlug = parseCollectionSlugFromHref(rail.viewAllHref);
    if (collectionSlug && collectionSlug !== "sale") {
      const fromCollection = await getCachedProductsByCollectionSlug(collectionSlug);
      take(fromCollection);
    }
  }

  return {
    items: merged,
    productSlugs: merged.map((p) => p.slug),
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
      const items = raw.filter((p) => {
        if (usedProductIds.has(p.id)) return false;
        usedProductIds.add(p.id);
        return true;
      });
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
