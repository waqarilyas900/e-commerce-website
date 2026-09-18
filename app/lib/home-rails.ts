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
const HOME_RAIL_PREVIEW = 5;

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

/**
 * Build home rails from `home_page_sections`.
 * Prefer collection membership (same source as the mega menu) so products land in the
 * correct category; fall back to section tags only when the collection has no products.
 */
async function loadRailsFromHomeSections(
  sections: Awaited<ReturnType<typeof getCachedActiveHomePageSectionsWithTags>>,
): Promise<HomeRailSection[]> {
  if (sections.length === 0) return [];

  const [taggedLists, collectionLists] = await Promise.all([
    Promise.all(
      sections.map((s) =>
        s.tagIds.length > 0
          ? getCachedProductsForHomeSectionTags(s.tagIds, s.slug)
          : Promise.resolve([] as Product[]),
      ),
    ),
    Promise.all(
      sections.map((s) => {
        const slug = normalizeCollectionSlug(s.slug);
        return getCachedProductsByCollectionSlug(slug);
      }),
    ),
  ]);

  const out: HomeRailSection[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    const tagged = taggedLists[i] ?? [];
    const fromCollection = collectionLists[i] ?? [];
    // Same source as mega menu — collection first; tags only if collection is empty.
    const useCollection = fromCollection.length > 0;
    const source = useCollection ? fromCollection : tagged;
    if (source.length === 0) continue;

    const items = orderByRatingAndStockPriority(source).slice(0, HOME_RAIL_PREVIEW);
    if (items.length === 0) continue;

    const slug = normalizeCollectionSlug(s.slug);
    const title = collectionDisplayName(slug, s.name);
    const viewAllHref = useCollection ? collectionHref(slug) : `/s/${s.slug}`;
    const totalProductCount = useCollection ? fromCollection.length : tagged.length;

    out.push({
      title,
      viewAllHref,
      productSlugs: items.map((p) => p.slug),
      items,
      totalProductCount,
    });
  }
  return out;
}

async function loadHomeRails(): Promise<HomeRailSection[]> {
  if (!hasCatalogDb()) {
    return [];
  }

  const configuredSections = await getCachedActiveHomePageSectionsWithTags();
  // Prefer sections that have tags OR a matching collection slug — not only tagged ones.
  if (configuredSections.length > 0) {
    const fromSections = await loadRailsFromHomeSections(configuredSections);
    if (fromSections.length > 0) return fromSections;
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

    if (items.length === 0) continue;

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
