/**
 * Canonical collection slugs, display names, and legacy slug redirects.
 * Keep footer, home tiles, header shop menu, and DB migrations aligned here.
 */
export type CollectionNavItem = {
  slug: string;
  name: string;
  href: string;
};

/** Legacy slug → current slug (301 targets live in `url_redirects`). */
export const COLLECTION_SLUG_ALIASES: Record<string, string> = {
  drinkware: "drinkware-tumblers",
  kitchen: "kitchen-essentials",
  appliances: "home-appliances",
  beauty: "beauty-personal-care",
  lighting: "lamps-lighting",
  wellness: "wellness-comfort",
  home: "home-essentials",
  "water-bottles": "drinkware-tumblers",
};

export const COLLECTION_NAV_ITEMS: CollectionNavItem[] = [
  {
    slug: "drinkware-tumblers",
    name: "Drinkware & Tumblers",
    href: "/collections/drinkware-tumblers",
  },
  {
    slug: "kitchen-essentials",
    name: "Kitchen Essentials",
    href: "/collections/kitchen-essentials",
  },
  {
    slug: "home-appliances",
    name: "Home Appliances",
    href: "/collections/home-appliances",
  },
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    href: "/collections/beauty-personal-care",
  },
  {
    slug: "lamps-lighting",
    name: "Lamps & Lighting",
    href: "/collections/lamps-lighting",
  },
  {
    slug: "pest-control",
    name: "Pest Control",
    href: "/collections/pest-control",
  },
  {
    slug: "wellness-comfort",
    name: "Wellness & Comfort",
    href: "/collections/wellness-comfort",
  },
  {
    slug: "home-essentials",
    name: "Home Essentials",
    href: "/collections/home-essentials",
  },
];

const DISPLAY_NAME_BY_SLUG = new Map(
  COLLECTION_NAV_ITEMS.map((item) => [item.slug, item.name] as const),
);

export function normalizeCollectionSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return trimmed;
  return COLLECTION_SLUG_ALIASES[trimmed] ?? trimmed;
}

export function collectionDisplayName(slug: string, fallbackName = ""): string {
  const normalized = normalizeCollectionSlug(slug);
  return DISPLAY_NAME_BY_SLUG.get(normalized) ?? (fallbackName.trim() || normalized);
}

export function collectionHref(slug: string): string {
  return `/collections/${normalizeCollectionSlug(slug)}`;
}

/** Footer / static nav — excludes `sale` and other non-catalog links. */
export const FOOTER_COLLECTION_LINKS: CollectionNavItem[] = [
  ...COLLECTION_NAV_ITEMS,
];
