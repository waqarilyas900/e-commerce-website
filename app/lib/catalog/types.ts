import type {
  CatalogBrand,
  HeroSlide,
  HomeCategoryRail,
} from "../store-brand.types";

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  collection: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  tags: string[];
  /** Set when loaded from DB; cheapest variant for quick add on PLP. */
  defaultVariantId?: string;
  /** From DB variants + inventory; omitted in static catalog (treated as in stock). */
  inStock?: boolean;
  /** ISO timestamp from DB when available (for collection sorting). */
  createdAt?: string;
};

export type Collection = {
  slug: string;
  name: string;
  description: string;
  heroImage: string;
};

export type Bundle = {
  slug: string;
  name: string;
  description: string;
  discountLabel: string;
  productSlugs: string[];
  image: string;
};

export type StoreCatalog = {
  brand: CatalogBrand;
  products: Product[];
  collections: Collection[];
  bundles: Bundle[];
  homeHeroSlides: HeroSlide[];
  homeCategoryRails: HomeCategoryRail[];
};
