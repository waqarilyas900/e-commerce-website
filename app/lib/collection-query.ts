import type { Product } from "@/app/lib/catalog/types";

export const COLLECTION_SORT_IDS = [
  "featured",
  "best-selling",
  "title-asc",
  "title-desc",
  "price-asc",
  "price-desc",
  "date-old",
  "date-new",
] as const;

export type CollectionSortId = (typeof COLLECTION_SORT_IDS)[number];

export type AvailabilityFilter = "all" | "in_stock" | "out_of_stock";

export type ParsedCollectionQuery = {
  sort: CollectionSortId;
  availability: AvailabilityFilter;
  priceMin: number | null;
  priceMax: number | null;
};

function parseSort(raw: string | undefined): CollectionSortId {
  if (raw && COLLECTION_SORT_IDS.includes(raw as CollectionSortId)) {
    return raw as CollectionSortId;
  }
  return "featured";
}

function parseAvailability(raw: string | undefined): AvailabilityFilter {
  if (raw === "in_stock" || raw === "out_of_stock") return raw;
  return "all";
}

function parsePrice(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Parse Next.js searchParams for /collections/[slug]. */
export function parseCollectionSearchParams(
  sp: Record<string, string | string[] | undefined>,
): ParsedCollectionQuery {
  const g = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    sort: parseSort(g("sort")),
    availability: parseAvailability(g("stock")),
    priceMin: parsePrice(g("min")),
    priceMax: parsePrice(g("max")),
  };
}

function isInStock(p: Product): boolean {
  return p.inStock === true;
}

function isOutOfStock(p: Product): boolean {
  return p.inStock === false;
}

function isRatedProduct(p: Product): boolean {
  return (p.rating ?? 0) > 0 || (p.reviews ?? 0) > 0;
}

/** Among rated: highest rating first, then most reviews. */
function compareRatedDescending(a: Product, b: Product): number {
  const byRating = (b.rating ?? 0) - (a.rating ?? 0);
  if (byRating !== 0) return byRating;
  const byReviews = (b.reviews ?? 0) - (a.reviews ?? 0);
  if (byReviews !== 0) return byReviews;
  return a.name.localeCompare(b.name);
}

/**
 * Default storefront priority (home rails + category featured):
 * 1) rated + in stock
 * 2) unrated + in stock
 * 3) out of stock (rated OOS before unrated OOS)
 */
export function orderByRatingAndStockPriority(products: Product[]): Product[] {
  const ratedInStock: Product[] = [];
  const unratedInStock: Product[] = [];
  const ratedOos: Product[] = [];
  const unratedOos: Product[] = [];

  for (const p of products) {
    const rated = isRatedProduct(p);
    const stock = isInStock(p);
    if (rated && stock) ratedInStock.push(p);
    else if (!rated && stock) unratedInStock.push(p);
    else if (rated) ratedOos.push(p);
    else unratedOos.push(p);
  }

  ratedInStock.sort(compareRatedDescending);
  unratedInStock.sort((a, b) => a.name.localeCompare(b.name));
  ratedOos.sort(compareRatedDescending);
  unratedOos.sort((a, b) => a.name.localeCompare(b.name));

  return [...ratedInStock, ...unratedInStock, ...ratedOos, ...unratedOos];
}

export function filterCollectionProducts(
  products: Product[],
  availability: AvailabilityFilter,
  priceMin: number | null,
  priceMax: number | null,
): Product[] {
  let list = products;
  if (availability === "in_stock") {
    list = list.filter(isInStock);
  } else if (availability === "out_of_stock") {
    list = list.filter(isOutOfStock);
  }
  if (priceMin != null) {
    list = list.filter((p) => p.price >= priceMin);
  }
  if (priceMax != null) {
    list = list.filter((p) => p.price <= priceMax);
  }
  return list;
}

function createdMs(p: Product): number {
  if (!p.createdAt) return 0;
  const t = new Date(p.createdAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Sort a copy; preserves relative order for `featured` (catalog / link order). */
export function sortCollectionProducts(
  products: Product[],
  sort: CollectionSortId,
  /** Original order indices for featured (slug -> index). */
  featuredIndex: Map<string, number>,
): Product[] {
  const copy = [...products];
  if (sort === "featured") {
    // Preserve catalog / home-section priority (rating+stock) when index was built from that order.
    copy.sort((a, b) => (featuredIndex.get(a.slug) ?? 0) - (featuredIndex.get(b.slug) ?? 0));
    return copy;
  }
  if (sort === "best-selling") {
    copy.sort((a, b) => {
      const dr = (b.reviews ?? 0) - (a.reviews ?? 0);
      if (dr !== 0) return dr;
      const drt = (b.rating ?? 0) - (a.rating ?? 0);
      if (drt !== 0) return drt;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }
  if (sort === "title-asc") {
    copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }
  if (sort === "title-desc") {
    copy.sort((a, b) => b.name.localeCompare(a.name));
    return copy;
  }
  if (sort === "price-asc") {
    copy.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    return copy;
  }
  if (sort === "price-desc") {
    copy.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    return copy;
  }
  if (sort === "date-old") {
    copy.sort((a, b) => createdMs(a) - createdMs(b) || a.slug.localeCompare(b.slug));
    return copy;
  }
  if (sort === "date-new") {
    copy.sort((a, b) => createdMs(b) - createdMs(a) || a.slug.localeCompare(b.slug));
    return copy;
  }
  return copy;
}

export function buildFeaturedIndex(products: Product[]): Map<string, number> {
  return new Map(products.map((p, i) => [p.slug, i]));
}

export function maxPriceCeiling(products: Product[]): number {
  if (!products.length) return 1_000_000;
  const m = Math.max(...products.map((p) => p.price));
  return Math.max(1, Math.ceil(m / 1000) * 1000);
}
