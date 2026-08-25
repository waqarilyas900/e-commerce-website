import { getCachedNavCollections } from "@/lib/cache/layout-data";

export type NavCollectionPreviewProduct = {
  slug: string;
  name: string;
  image: string;
  href: string;
};

export type NavCollectionLink = {
  slug: string;
  name: string;
  /** Collection hero or first product image — used in mega menu. */
  imageUrl?: string;
  /** Top products for AliExpress-style “Recommended” panel. */
  products?: NavCollectionPreviewProduct[];
};

/**
 * Delegates to the tag-revalidated cache layer so every call site (header,
 * footer, nav menu provider) reads from the same in-process cache slice and
 * pays the DB cost at most once per `LAYOUT_CACHE_TAGS.navCollections`
 * window (default 5 min) instead of on every navigation.
 */
export const getNavCollectionLinks = getCachedNavCollections;
