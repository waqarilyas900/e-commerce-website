/** Rows aligned with public.collections / products / product_variants */

import { type CollectionTypeDb } from "@/app/lib/db/collection-type";

export type DbCollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  hero_image: string;
  sort_order: number;
  /** `public.collection_type` enum; omit only before migration. */
  collection_type?: CollectionTypeDb;
};

/** `public.home_page_sections` — homepage product rails + `/s/{slug}` listing. */
export type DbHomePageSectionRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

export type DbProductRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  status: string;
  images: unknown;
  tags: string[] | null;
  rating: number | null;
  reviews_count: number | null;
  stock_total: number | null;
  created_at?: string;
};

/** Gallery rows from public.product_assets */
export type DbProductAssetRow = {
  id: string;
  product_id: string;
  url: string;
  kind: "image" | "video";
  sort_order: number;
  alt_text: string;
};

export type DbProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  option_values: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  size_id: string | null;
  color_id: string | null;
  /** max add-to-cart ≈ max(0, quantity_on_hand - quantity_reserved) */
  quantity_on_hand: number;
  quantity_reserved: number;
};
