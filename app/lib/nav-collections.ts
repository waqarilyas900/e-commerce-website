import { cache } from "react";
import { dbListCollections } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";

export type NavCollectionLink = { slug: string; name: string };

async function fetchNavCollectionLinks(): Promise<NavCollectionLink[]> {
  if (!hasCatalogDb()) {
    return [];
  }
  const rows = await dbListCollections();
  return rows.map((c) => ({ slug: c.slug, name: c.name }));
}

/** Dedupes within a single request (safe with `cookies()` — unlike `unstable_cache`). */
export const getNavCollectionLinks = cache(fetchNavCollectionLinks);
