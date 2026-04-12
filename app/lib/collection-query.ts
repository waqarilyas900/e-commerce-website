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
  return p.inStock !== false;
}

function isOutOfStock(p: Product): boolean {
  return p.inStock === false;
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
