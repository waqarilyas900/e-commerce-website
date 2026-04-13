import { cache } from "react";
import type { Product } from "@/app/lib/catalog/types";
import {
  dbGetProductsBySlugs,
  dbListAllActiveProductsForCards,
  dbListProductsByCollectionSlug,
} from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { homeCategoryRails, products, productsBySlugs } from "@/app/lib/store-data";
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

async function getTotalProductsForViewAllHref(viewAllHref: string): Promise<number> {
  const slug = parseCollectionSlugFromHref(viewAllHref);
  if (!slug) return 0;

  if (slug === "sale") {
    if (hasCatalogDb()) {
      const all = await dbListAllActiveProductsForCards();
      return all.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price).length;
    }
    return products.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.price).length;
  }

  if (hasCatalogDb()) {
    const list = await dbListProductsByCollectionSlug(slug);
    return list.length;
  }

  return products.filter((p) => p.collection === slug).length;
}

async function loadHomeRails(): Promise<HomeRailSection[]> {
  return Promise.all(
    homeCategoryRails.map(async (rail) => {
      const totalProductCount = await getTotalProductsForViewAllHref(rail.viewAllHref);
      if (hasCatalogDb()) {
        const fromDb = await dbGetProductsBySlugs(rail.productSlugs);
        if (fromDb.length > 0) {
          return { ...rail, items: fromDb, totalProductCount };
        }
      }
      return { ...rail, items: productsBySlugs(rail.productSlugs), totalProductCount };
    }),
  );
}

/** Dedupes within a single request if home data is needed more than once. */
export const getHomeRailSections = cache(loadHomeRails);
