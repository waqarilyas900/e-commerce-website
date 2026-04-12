import { cache } from "react";
import { collections } from "@/app/lib/store-data";
import { dbListCollections } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";

export type NavCollectionLink = { slug: string; name: string };

async function fetchNavCollectionLinks(): Promise<NavCollectionLink[]> {
  if (hasCatalogDb()) {
    const rows = await dbListCollections();
    if (rows.length > 0) {
      return rows.map((c) => ({ slug: c.slug, name: c.name }));
    }
  }
  return collections.map((c) => ({ slug: c.slug, name: c.name }));
}

/** Dedupes within a single request (safe with `cookies()` — unlike `unstable_cache`). */
export const getNavCollectionLinks = cache(fetchNavCollectionLinks);
