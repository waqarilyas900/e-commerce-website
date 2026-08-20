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
 * when slugs are stale (renamed/draft) so Beauty/Lighting etc. still show ≥4 items.
 */
async function resolveRailProducts(
  rail: HomeCategoryRail,
): Promise<{ items: Product[]; productSlugs: string[] }> {
  const curated = await getCachedProductsBySlugs(rail.productSlugs);
  if (curated.length >= MIN_RAIL_PRODUCTS) {
    return {
      items: curated.slice(0, MAX_RAIL_PRODUCTS),
      productSlugs: curated.slice(0, MAX_RAIL_PRODUCTS).map((p) => p.slug),
    };
  }

  const collectionSlug = parseCollectionSlugFromHref(rail.viewAllHref);
  if (!collectionSlug || collectionSlug === "sale") {
    return {
      items: curated.slice(0, MAX_RAIL_PRODUCTS),
      productSlugs: curated.slice(0, MAX_RAIL_PRODUCTS).map((p) => p.slug),
    };
  }

  const fromCollection = await getCachedProductsByCollectionSlug(collectionSlug);
  const seen = new Set(curated.map((p) => p.id));
  const merged = [...curated];
  for (const p of fromCollection) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
    if (merged.length >= MAX_RAIL_PRODUCTS) break;
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
    return Promise.all(
      sectionsWithTags.map(async (s) => {
        const items = await getCachedProductsForHomeSectionTags(s.tagIds, s.slug);
        const rail: HomeCategoryRail = {
          title: s.name,
          viewAllHref: `/s/${s.slug}`,
          productSlugs: items.map((p) => p.slug),
        };
        return { ...rail, items, totalProductCount: items.length };
      }),
    );
  }

  const rails = await dbGetHomeRailsConfig();
  if (rails.length === 0) {
    return [];
  }

  return Promise.all(
    rails.map(async (rail) => {
      const totalProductCount = await getTotalProductsForViewAllHref(rail.viewAllHref);
      const { items, productSlugs } = await resolveRailProducts(rail);
      return { ...rail, productSlugs, items, totalProductCount };
    }),
  );
}

/** Dedupes within a single request if home data is needed more than once. */
export const getHomeRailSections = cache(loadHomeRails);
