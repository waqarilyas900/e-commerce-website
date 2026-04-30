import { getCachedNavCollections } from "@/lib/cache/layout-data";

export type NavCollectionLink = { slug: string; name: string };

/**
 * Delegates to the tag-revalidated cache layer so every call site (header,
 * footer, nav menu provider) reads from the same in-process cache slice and
 * pays the DB cost at most once per `LAYOUT_CACHE_TAGS.navCollections`
 * window (default 5 min) instead of on every navigation.
 */
export const getNavCollectionLinks = getCachedNavCollections;
