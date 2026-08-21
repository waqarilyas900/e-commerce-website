/**
 * Tag-revalidated wrappers around the public catalog reads in
 * `app/lib/db/catalog.ts`.
 *
 * Why this exists:
 *   - `app/layout.tsx` is `force-dynamic` (Supabase auth in the Header), so
 *     pages cannot rely on Next's automatic full-route cache. Without an
 *     in-process layer, every navigation re-runs the same product / collection
 *     SQL.
 *   - `unstable_cache` is incompatible with `cookies()`, which is why the
 *     underlying helpers were switched to `createAnonServerSupabase()` (see
 *     `catalogClient()` in `catalog.ts`). They are now safe to wrap here.
 *
 * Cache invalidation:
 *   - Each cached entry is keyed on its slug/id and tagged so the admin panel
 *     can bust precisely what it edited via `/api/revalidate`. See
 *     `CATALOG_CACHE_TAGS` for the universe of tags.
 */

import { unstable_cache } from "next/cache";
import {
  dbFindUniqueActiveProductSlugByPrefix,
  dbGetProductDetailBySlug,
  dbListActiveHomePageSectionsWithTags,
  dbListAllActiveProductsForCards,
  dbListCollections,
  dbListProductsByCollectionSlug,
  dbListProductsForHomeSectionTags,
  dbGetActiveHomePageSectionWithTagsBySlug,
  dbGetCollectionBySlug,
  dbGetProductsBySlugs,
} from "@/app/lib/db/catalog";

// ---------- Tags ----------

export const CATALOG_CACHE_TAGS = {
  /** Bust when storefront review aggregates / trust strip should refresh (not every product grid). */
  storeReviewAggregate: "catalog:store-review-aggregate",
  /** Bust this when ANY product is added / updated / deleted (cards/grids). */
  products: "catalog:products",
  /** Bust this when collection rows change (slugs, names, hero, type). */
  collections: "catalog:collections",
  /** Bust this when home_page_sections / home_page_section_tags change. */
  homeSections: "catalog:home-sections",
  /** Per-product tag — bust on edit of one product. Pattern: catalog:product:<slug>. */
  product: (slug: string) => `catalog:product:${slug}`,
  /** Per-collection tag — bust on edit of one collection. Pattern: catalog:collection:<slug>. */
  collection: (slug: string) => `catalog:collection:${slug}`,
  /** Per-home-section tag — bust on edit of one section. Pattern: catalog:home-section:<slug>. */
  homeSection: (slug: string) => `catalog:home-section:${slug}`,
} as const;

/** Universal busts for "rebuild the whole catalog cache" (`all: true` in revalidate). */
export const ALL_CATALOG_BROAD_TAGS: readonly string[] = [
  CATALOG_CACHE_TAGS.storeReviewAggregate,
  CATALOG_CACHE_TAGS.products,
  CATALOG_CACHE_TAGS.collections,
  CATALOG_CACHE_TAGS.homeSections,
];

// Cache TTLs are conservative because tag invalidation is the primary
// freshness mechanism; the TTL is only the worst-case staleness if an admin
// edit fails to call `/api/revalidate`.
const PRODUCT_DETAIL_TTL = 60 * 10; // 10 minutes
const LIST_TTL = 60 * 5; // 5 minutes
const HOME_SECTIONS_TTL = 60 * 5;

// ---------- Detail (per-slug) ----------

/**
 * Memoized PDP detail. Shared across every render of `/products/<slug>` until
 * the per-slug or global products tag is busted. This is the single biggest
 * latency win for the storefront because the underlying helper does up to six
 * sequential queries (product → collections → variants → inventory → colors →
 * assets → option definitions) — caching turns ~600 ms into ~5 ms.
 */
export function getCachedProductDetailBySlug(slug: string) {
  return unstable_cache(
    async () => dbGetProductDetailBySlug(slug),
    ["catalog:product-detail-v4", slug],
    {
      revalidate: 60,
      tags: [CATALOG_CACHE_TAGS.product(slug), CATALOG_CACHE_TAGS.products],
    },
  )();
}

/** Uncached prefix lookup — used only on exact-slug misses (rare). */
export async function findUniqueActiveProductSlugByPrefix(prefix: string) {
  return dbFindUniqueActiveProductSlugByPrefix(prefix);
}

export function getCachedCollectionBySlug(slug: string) {
  return unstable_cache(
    async () => dbGetCollectionBySlug(slug),
    ["catalog:collection-by-slug", slug],
    {
      revalidate: LIST_TTL,
      tags: [
        CATALOG_CACHE_TAGS.collection(slug),
        CATALOG_CACHE_TAGS.collections,
      ],
    },
  )();
}

/** Listing for `/collections/<slug>` and PDP "related products" panel. */
export function getCachedProductsByCollectionSlug(slug: string) {
  return unstable_cache(
    async () => dbListProductsByCollectionSlug(slug),
    ["catalog:products-by-collection", slug],
    {
      revalidate: LIST_TTL,
      tags: [
        CATALOG_CACHE_TAGS.collection(slug),
        CATALOG_CACHE_TAGS.collections,
        CATALOG_CACHE_TAGS.products,
      ],
    },
  )();
}

/** Hydrates curated rails on the homepage. */
export function getCachedProductsBySlugs(slugs: readonly string[]) {
  // Stable cache key: sorted, comma-joined. Reordering the same slugs returns
  // the same row from cache; adding/removing a slug invalidates implicitly.
  const key = [...slugs].sort().join(",");
  return unstable_cache(
    async () => dbGetProductsBySlugs([...slugs]),
    ["catalog:products-by-slugs", key],
    {
      revalidate: LIST_TTL,
      tags: [CATALOG_CACHE_TAGS.products],
    },
  )();
}

// ---------- Broad lists ----------

export const getCachedAllActiveProductsForCards = unstable_cache(
  async () => dbListAllActiveProductsForCards(),
  ["catalog:all-active-products"],
  {
    revalidate: LIST_TTL,
    tags: [CATALOG_CACHE_TAGS.products],
  },
);

export const getCachedListCollections = unstable_cache(
  async () => dbListCollections(),
  ["catalog:list-collections"],
  {
    revalidate: LIST_TTL,
    tags: [CATALOG_CACHE_TAGS.collections],
  },
);

export const getCachedActiveHomePageSectionsWithTags = unstable_cache(
  async () => dbListActiveHomePageSectionsWithTags(),
  ["catalog:home-sections-with-tags"],
  {
    revalidate: HOME_SECTIONS_TTL,
    tags: [CATALOG_CACHE_TAGS.homeSections],
  },
);

export function getCachedActiveHomePageSectionWithTagsBySlug(slug: string) {
  return unstable_cache(
    async () => dbGetActiveHomePageSectionWithTagsBySlug(slug),
    ["catalog:home-section-with-tags-by-slug", slug],
    {
      revalidate: HOME_SECTIONS_TTL,
      tags: [
        CATALOG_CACHE_TAGS.homeSection(slug),
        CATALOG_CACHE_TAGS.homeSections,
      ],
    },
  )();
}

/** Products for a curated home rail (tag-driven). Keyed by section slug. */
export function getCachedProductsForHomeSectionTags(
  tagIds: readonly string[],
  sectionSlug: string,
) {
  const tagKey = [...tagIds].sort().join(",");
  return unstable_cache(
    async () => dbListProductsForHomeSectionTags([...tagIds], sectionSlug),
    ["catalog:home-section-products", sectionSlug, tagKey],
    {
      revalidate: HOME_SECTIONS_TTL,
      tags: [
        CATALOG_CACHE_TAGS.homeSection(sectionSlug),
        CATALOG_CACHE_TAGS.homeSections,
        CATALOG_CACHE_TAGS.products,
      ],
    },
  )();
}
