import { cache } from "react";
import type { Product } from "@/app/lib/catalog/types";
import { dbGetProductsBySlugs } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { homeCategoryRails, productsBySlugs } from "@/app/lib/store-data";
import type { HomeCategoryRail } from "@/app/lib/store-brand.types";

export type HomeRailSection = HomeCategoryRail & { items: Product[] };

async function loadHomeRails(): Promise<HomeRailSection[]> {
  return Promise.all(
    homeCategoryRails.map(async (rail) => {
      if (hasCatalogDb()) {
        const fromDb = await dbGetProductsBySlugs(rail.productSlugs);
        if (fromDb.length > 0) {
          return { ...rail, items: fromDb };
        }
      }
      return { ...rail, items: productsBySlugs(rail.productSlugs) };
    }),
  );
}

/** Dedupes within a single request if home data is needed more than once. */
export const getHomeRailSections = cache(loadHomeRails);
