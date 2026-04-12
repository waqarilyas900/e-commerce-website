import { createClient } from "@/lib/supabase/server";
import type {
  DbCollectionRow,
  DbProductAssetRow,
  DbProductRow,
  DbProductVariantRow,
} from "@/app/lib/db/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/app/lib/catalog/types";
import { hasCatalogDb } from "@/app/lib/db/env";

let warnedMissingCatalogSchema = false;

function isMissingCatalogTableError(msg: string | undefined): boolean {
  if (!msg) return false;
  return (
    msg.includes("Could not find the table") || msg.includes("schema cache")
  );
}

/** Avoid flooding the server console when migrations are not applied yet. */
function logDbCatalogIssue(op: string, message: string | undefined) {
  if (!message) return;
  if (isMissingCatalogTableError(message)) {
    if (!warnedMissingCatalogSchema) {
      warnedMissingCatalogSchema = true;
      console.warn(
        "[db] Supabase catalog tables are missing. Apply migrations (`supabase db push` or run SQL from supabase/migrations). Pages that support it will fall back to the static catalog.",
      );
    }
    return;
  }
  console.error(`[db] ${op}`, message);
}

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

function minPrice(variants: { price: number }[]): number {
  if (!variants.length) return 0;
  return Math.min(...variants.map((v) => v.price));
}

function minCompareAt(variants: { compare_at_price: number | null; price: number }[]): number | undefined {
  const vals = variants
    .map((v) => v.compare_at_price)
    .filter((x): x is number => x != null && x > 0);
  if (!vals.length) return undefined;
  return Math.min(...vals);
}

function pickDefaultVariantId(variants: DbProductVariantRow[]): string | undefined {
  if (!variants.length) return undefined;
  const sorted = [...variants].sort((a, b) => Number(a.price) - Number(b.price));
  return sorted[0].id;
}

function productInStockFromVariants(variants: DbProductVariantRow[]): boolean {
  if (!variants.length) return false;
  return variants.some((v) => v.quantity_on_hand - v.quantity_reserved > 0);
}

async function mergeInventoryForVariants(
  supabase: SupabaseClient,
  variantRows: Omit<
    DbProductVariantRow,
    "quantity_on_hand" | "quantity_reserved"
  >[],
): Promise<DbProductVariantRow[]> {
  if (!variantRows.length) return [];
  const ids = variantRows.map((v) => v.id);
  const { data: inv } = await supabase
    .from("inventory")
    .select("product_variant_id, quantity_on_hand, quantity_reserved")
    .in("product_variant_id", ids);
  const byId = new Map(
    (inv ?? []).map((r: { product_variant_id: string; quantity_on_hand: number; quantity_reserved: number }) => [
      r.product_variant_id,
      r,
    ]),
  );
  return variantRows.map((v) => {
    const row = byId.get(v.id);
    return {
      ...v,
      quantity_on_hand: row?.quantity_on_hand ?? 0,
      quantity_reserved: row?.quantity_reserved ?? 0,
    };
  });
}

export function mapProductCard(
  p: DbProductRow,
  variants: DbProductVariantRow[],
  collectionSlug: string,
): Product {
  const price = minPrice(variants);
  const compareAt = minCompareAt(variants);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.short_description,
    description: p.description,
    category: collectionSlug,
    collection: collectionSlug,
    price,
    compareAtPrice: compareAt,
    rating: p.rating ?? 0,
    reviews: p.reviews_count ?? 0,
    image: firstImage(p.images),
    tags: p.tags ?? [],
    defaultVariantId: pickDefaultVariantId(variants),
    inStock: productInStockFromVariants(variants),
    createdAt: p.created_at ? String(p.created_at) : undefined,
  };
}

/** Primary collection slug per product (lowest `collections.sort_order`) for card display. */
async function primaryDisplaySlugByProductId(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, string>> {
  if (!productIds.length) return new Map();
  const { data: links, error: lErr } = await supabase
    .from("product_collections")
    .select("product_id, collection_id")
    .in("product_id", productIds);
  if (lErr) {
    logDbCatalogIssue("productCollections", lErr.message);
    return new Map();
  }
  if (!links?.length) return new Map();
  const colIds = [
    ...new Set(
      (links as { collection_id: string }[]).map((l) => l.collection_id),
    ),
  ];
  const { data: cols, error: cErr } = await supabase
    .from("collections")
    .select("id, slug, sort_order")
    .in("id", colIds);
  if (cErr || !cols?.length) {
    if (cErr) logDbCatalogIssue("collectionsForDisplay", cErr.message);
    return new Map();
  }
  const colMeta = new Map(
    cols.map((c: { id: string; slug: string; sort_order: number }) => [
      c.id,
      { slug: c.slug, sort_order: c.sort_order },
    ]),
  );
  const grouped = new Map<string, { slug: string; sort_order: number }[]>();
  for (const l of links as { product_id: string; collection_id: string }[]) {
    const meta = colMeta.get(l.collection_id);
    if (!meta) continue;
    const g = grouped.get(l.product_id) ?? [];
    g.push(meta);
    grouped.set(l.product_id, g);
  }
  const out = new Map<string, string>();
  for (const [pid, list] of grouped) {
    list.sort((a, b) => a.sort_order - b.sort_order);
    if (list[0]) out.set(pid, list[0].slug);
  }
  return out;
}

const PRODUCT_SELECT =
  "id, slug, name, short_description, description, status, images, tags, rating, reviews_count, stock_total, created_at";

/** All active products with variant-derived prices (for /collections grid, sale filter). */
export async function dbListAllActiveProductsForCards(): Promise<Product[]> {
  if (!hasCatalogDb()) return [];
  const supabase = await createClient();
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active");

  if (pErr || !products?.length) {
    if (pErr) logDbCatalogIssue("listAllActiveProducts", pErr.message);
    return [];
  }

  const plist = products as DbProductRow[];
  const ids = plist.map((p) => p.id);
  const displaySlug = await primaryDisplaySlugByProductId(supabase, ids);

  const { data: rawVariants } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, option_values, price, compare_at_price, size_id, color_id")
    .in("product_id", ids);

  const variants = await mergeInventoryForVariants(
    supabase,
    (rawVariants ?? []) as Omit<
      DbProductVariantRow,
      "quantity_on_hand" | "quantity_reserved"
    >[],
  );

  const byProduct = new Map<string, DbProductVariantRow[]>();
  for (const v of variants) {
    const row = v;
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  return plist.map((p) => {
    const slug = displaySlug.get(p.id) ?? "uncategorized";
    return mapProductCard(p, byProduct.get(p.id) ?? [], slug);
  });
}

export async function dbListCollections(): Promise<DbCollectionRow[]> {
  if (!hasCatalogDb()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, hero_image, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    logDbCatalogIssue("listCollections", error.message);
    return [];
  }
  return (data ?? []) as DbCollectionRow[];
}

export async function dbGetCollectionBySlug(
  slug: string,
): Promise<DbCollectionRow | null> {
  if (!hasCatalogDb()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, hero_image, sort_order")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    logDbCatalogIssue("getCollectionBySlug", error.message);
    return null;
  }
  return data as DbCollectionRow | null;
}

export async function dbListProductsByCollectionSlug(
  collectionSlug: string,
): Promise<Product[]> {
  if (!hasCatalogDb()) return [];
  const col = await dbGetCollectionBySlug(collectionSlug);
  if (!col) return [];

  const supabase = await createClient();
  const { data: linkRows, error: linkErr } = await supabase
    .from("product_collections")
    .select("product_id")
    .eq("collection_id", col.id)
    .order("created_at", { ascending: true });
  if (linkErr) {
    logDbCatalogIssue("listProductsByCollectionLinks", linkErr.message);
    return [];
  }
  const productIds = (linkRows ?? []).map((r: { product_id: string }) => r.product_id);
  if (!productIds.length) return [];

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds)
    .eq("status", "active");

  if (pErr || !products?.length) {
    if (pErr) logDbCatalogIssue("listProductsByCollection", pErr.message);
    return [];
  }

  const plist = products as DbProductRow[];
  const ids = plist.map((p) => p.id);
  const { data: rawVariants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, option_values, price, compare_at_price, size_id, color_id")
    .in("product_id", ids);

  if (vErr) {
    logDbCatalogIssue("variantsForCollection", vErr.message);
    return [];
  }

  const variants = await mergeInventoryForVariants(
    supabase,
    (rawVariants ?? []) as Omit<
      DbProductVariantRow,
      "quantity_on_hand" | "quantity_reserved"
    >[],
  );

  const byProduct = new Map<string, DbProductVariantRow[]>();
  for (const v of variants) {
    const row = v;
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  const order = new Map(productIds.map((id, i) => [id, i]));
  plist.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return plist.map((p) =>
    mapProductCard(p, byProduct.get(p.id) ?? [], col.slug),
  );
}

export async function dbGetProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (!slugs.length || !hasCatalogDb()) return [];
  const supabase = await createClient();
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("slug", slugs)
    .eq("status", "active");

  if (pErr || !products?.length) {
    if (pErr) logDbCatalogIssue("getProductsBySlugs", pErr.message);
    return [];
  }

  const plist = products as DbProductRow[];
  const ids = plist.map((p) => p.id);
  const displaySlug = await primaryDisplaySlugByProductId(supabase, ids);

  const { data: rawVariants } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, option_values, price, compare_at_price, size_id, color_id")
    .in("product_id", ids);

  const variants = await mergeInventoryForVariants(
    supabase,
    (rawVariants ?? []) as Omit<
      DbProductVariantRow,
      "quantity_on_hand" | "quantity_reserved"
    >[],
  );

  const byProduct = new Map<string, DbProductVariantRow[]>();
  for (const v of variants) {
    const row = v;
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  const order = new Map(slugs.map((s, i) => [s, i]));
  plist.sort((a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999));

  return plist.map((p) => {
    const slug = displaySlug.get(p.id) ?? "uncategorized";
    return mapProductCard(p, byProduct.get(p.id) ?? [], slug);
  });
}

export type ProductDetail = {
  product: DbProductRow;
  collectionSlug: string;
  variants: DbProductVariantRow[];
  assets: DbProductAssetRow[];
};

export async function dbGetProductDetailBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  if (!hasCatalogDb()) return null;
  const supabase = await createClient();
  const { data: p, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (pErr || !p) {
    if (pErr) logDbCatalogIssue("getProductDetail", pErr.message);
    return null;
  }

  const row = p as DbProductRow;

  let collectionSlug = "uncategorized";
  const { data: pcl } = await supabase
    .from("product_collections")
    .select("collection_id")
    .eq("product_id", row.id);
  const pcIds = (pcl ?? []).map((x: { collection_id: string }) => x.collection_id);
  if (pcIds.length) {
    const { data: cdata } = await supabase
      .from("collections")
      .select("slug, sort_order")
      .in("id", pcIds);
    const sorted = [...(cdata ?? [])] as { slug: string; sort_order: number }[];
    sorted.sort((a, b) => a.sort_order - b.sort_order);
    if (sorted[0]?.slug) collectionSlug = sorted[0].slug;
  }

  const { data: rawVariants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, option_values, price, compare_at_price, size_id, color_id")
    .eq("product_id", row.id);

  if (vErr) {
    logDbCatalogIssue("productVariants", vErr.message);
    return null;
  }

  const merged = await mergeInventoryForVariants(
    supabase,
    (rawVariants ?? []) as Omit<
      DbProductVariantRow,
      "quantity_on_hand" | "quantity_reserved"
    >[],
  );

  const { data: assetRows, error: aErr } = await supabase
    .from("product_assets")
    .select("id, product_id, url, kind, sort_order, alt_text")
    .eq("product_id", row.id)
    .order("sort_order", { ascending: true });

  if (aErr) {
    logDbCatalogIssue("productAssets", aErr.message);
  }

  return {
    product: row,
    collectionSlug,
    variants: merged,
    assets: (assetRows ?? []) as DbProductAssetRow[],
  };
}

export async function dbSearchProducts(q: string): Promise<Product[]> {
  const term = q.trim().replace(/[,%]/g, " ");
  if (!term || !hasCatalogDb()) return [];

  const supabase = await createClient();
  const pattern = `%${term}%`;

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .or(
      `name.ilike.${pattern},description.ilike.${pattern},short_description.ilike.${pattern}`,
    );

  if (pErr || !products?.length) {
    if (pErr) logDbCatalogIssue("search", pErr.message);
    return [];
  }

  const plist = products as DbProductRow[];
  const ids = plist.map((p) => p.id);
  const displaySlug = await primaryDisplaySlugByProductId(supabase, ids);

  const { data: rawVariants } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, option_values, price, compare_at_price, size_id, color_id")
    .in("product_id", ids);

  const variants = await mergeInventoryForVariants(
    supabase,
    (rawVariants ?? []) as Omit<
      DbProductVariantRow,
      "quantity_on_hand" | "quantity_reserved"
    >[],
  );

  const byProduct = new Map<string, DbProductVariantRow[]>();
  for (const v of variants) {
    const row = v;
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  return plist.map((p) => {
    const slug = displaySlug.get(p.id) ?? "uncategorized";
    return mapProductCard(p, byProduct.get(p.id) ?? [], slug);
  });
}
