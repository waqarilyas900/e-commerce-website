import { cache } from "react";
import { getCachedAllActiveProductsForCards } from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { getHomeRailSections } from "@/app/lib/home-rails";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";

export type CalloutProductImage = {
  src: string;
  alt: string;
  href: string;
};

const CALLOUT_COUNT = 5;

function pushUnique(
  out: CalloutProductImage[],
  seen: Set<string>,
  image: string,
  name: string,
  slug: string,
) {
  const raw = image.trim();
  if (!raw) return;
  const key = raw.split("?")[0]!.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    src: optimizeSupplierImageUrl(raw, 720),
    alt: name,
    href: `/products/${slug}`,
  });
}

/**
 * Five distinct product first-images for the Rad-style collection callout collage.
 * Prefers one product per home rail / category, then fills from the catalog.
 */
async function loadHomeCalloutImages(): Promise<CalloutProductImage[]> {
  if (!hasCatalogDb()) return [];

  const seen = new Set<string>();
  const out: CalloutProductImage[] = [];

  const rails = await getHomeRailSections();
  for (const rail of rails) {
    if (out.length >= CALLOUT_COUNT) break;
    const pick = rail.items.find((p) => (p.image ?? "").trim());
    if (!pick) continue;
    pushUnique(out, seen, pick.image, pick.name, pick.slug);
  }

  if (out.length < CALLOUT_COUNT) {
    const products = await getCachedAllActiveProductsForCards();
    for (const p of products) {
      if (out.length >= CALLOUT_COUNT) break;
      pushUnique(out, seen, p.image ?? "", p.name, p.slug);
    }
  }

  return out;
}

export const getHomeCalloutImages = cache(loadHomeCalloutImages);
