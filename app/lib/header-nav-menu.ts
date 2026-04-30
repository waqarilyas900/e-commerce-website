import { getCachedHeaderNavMenu } from "@/lib/cache/layout-data";

export type HeaderNavMenuItem = {
  id: string;
  name: string;
  label: string;
  slug: string;
  /** Always `/collections/{slug}` from the assigned collection. */
  href: string;
  sort_order: number;
};

/**
 * Delegates to the tag-revalidated layout cache so every Header instance on
 * every navigation reuses the same query result and the menu only pays a DB
 * roundtrip once per `LAYOUT_CACHE_TAGS.headerNavMenu` window.
 */
export const getHeaderNavMenuItems = getCachedHeaderNavMenu;
