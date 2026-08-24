import { cache } from "react";
import type { Product } from "@/app/lib/catalog/types";
import {
  collectionDisplayName,
  collectionHref,
  normalizeCollectionSlug,
} from "@/lib/catalog/collection-nav";
import {
  getCachedActiveHomePageSectionsWithTags,
  getCachedAllActiveProductsForCards,
  getCachedProductsByCollectionSlug,
  getCachedProductsBySlugs,
  getCachedProductsForHomeSectionTags,
} from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { orderByRatingAndStockPriority } from "@/app/lib/collection-query";
import { dbGetHomeRailsConfig } from "@/app/lib/home-rails-from-db";
import type { HomeCategoryRail } from "@/app/lib/store-brand.types";

export type HomeRailSection = HomeCategoryRail & {
  items: Product[];
  /** Total products in the linked collection (or sale filter), not just the rail preview. */
  totalProductCount: number;
};

/** Must match `RAIL_PREVIEW` in ProductSection — home shows this many cards per category. */
const HOME_RAIL_PREVIEW = 4;

function parseCollectionSlugFromHref(href: string): string | null {
  const m = href.trim().match(/^\/collections\/([^/?#]+)\/?$/);
  if (!m?.[1]) return null;
  return normalizeCollectionSlug(m[1]);
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

async function loadHomeRails(): Promise<HomeRailSection[]> {
  if (!hasCatalogDb()) {
    return [];
  }

  const configuredSections = await getCachedActiveHomePageSectionsWithTags();
  const sectionsWithTags = configuredSections.filter((s) => s.tagIds.length > 0);
  if (sectionsWithTags.length > 0) {
    // Fetch every section's products in parallel, then dedupe in rail order.
    const rawLists = await Promise.all(
      sectionsWithTags.map((s) =>
        getCachedProductsForHomeSectionTags(s.tagIds, s.slug),
      ),
    );
    const usedProductIds = new Set<string>();
    const out: HomeRailSection[] = [];
    for (let i = 0; i < sectionsWithTags.length; i++) {
      const s = sectionsWithTags[i]!;
      const raw = rawLists[i] ?? [];
      const available = raw.filter((p) => !usedProductIds.has(p.id));
      const items = orderByRatingAndStockPriority(available);
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

  // Prefetch totals + curated + collection fill for all rails together.
  const railData = await Promise.all(
    rails.map(async (rail) => {
      const collectionSlug = parseCollectionSlugFromHref(rail.viewAllHref);

      if (collectionSlug === "sale") {
        const [totalProductCount, curated] = await Promise.all([
          getTotalProductsForViewAllHref(rail.viewAllHref),
          getCachedProductsBySlugs(rail.productSlugs),
        ]);
        return {
          rail,
          totalProductCount,
          curated,
          collectionProducts: [] as Product[],
        };
      }

      if (collectionSlug) {
        const [curated, collectionProducts] = await Promise.all([
          getCachedProductsBySlugs(rail.productSlugs),
          getCachedProductsByCollectionSlug(collectionSlug),
        ]);
        return {
          rail,
          totalProductCount: collectionProducts.length,
          curated,
          collectionProducts,
        };
      }

      const curated = await getCachedProductsBySlugs(rail.productSlugs);
      return {
        rail,
        totalProductCount: 0,
        curated,
        collectionProducts: [] as Product[],
      };
    }),
  );

  const usedProductIds = new Set<string>();
  const out: HomeRailSection[] = [];
  for (const { rail, totalProductCount, curated, collectionProducts } of railData) {
    const collectionSlug = parseCollectionSlugFromHref(rail.viewAllHref);
    const normalizedHref = collectionSlug ? collectionHref(collectionSlug) : rail.viewAllHref;
    const normalizedTitle = collectionSlug
      ? collectionDisplayName(collectionSlug, rail.title)
      : rail.title;

    let items: Product[];
    if (collectionProducts.length > 0) {
      // Each rail shows its own collection — do not strip products already used above.
      items = orderByRatingAndStockPriority(collectionProducts).slice(0, HOME_RAIL_PREVIEW);
    } else {
      const available = curated.filter((p) => !usedProductIds.has(p.id));
      items = orderByRatingAndStockPriority(available).slice(0, HOME_RAIL_PREVIEW);
      for (const p of items) {
        usedProductIds.add(p.id);
      }
    }

    const count =
      collectionProducts.length > 0 ? collectionProducts.length : totalProductCount;

    out.push({
      ...rail,
      title: normalizedTitle,
      viewAllHref: normalizedHref,
      productSlugs: items.map((p) => p.slug),
      items,
      totalProductCount: count,
    });
  }
  return out;
}

/** Dedupes within a single request if home data is needed more than once. */
export const getHomeRailSections = cache(loadHomeRails);
