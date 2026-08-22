import { createClient } from "@/lib/supabase/server";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";
import type {
  DbCollectionRow,
  DbHomePageSectionRow,
  DbProductAssetRow,
  DbProductRow,
  DbProductVariantRow,
} from "@/app/lib/db/types";
import { collectionIsTagBased } from "@/app/lib/db/collection-type";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/app/lib/catalog/types";
import {
  optionDefinitionsFromDbRows,
  type VariantOptionSchemaEntry,
} from "@/app/lib/catalog/variant-option-schema";
import { hasCatalogDb } from "@/app/lib/db/env";
import { orderByRatingAndStockPriority } from "@/app/lib/collection-query";

/**
 * Public catalog reads (products, collections, variants, assets, inventory,
 * home sections, tags) never depend on the signed-in user — they're driven
 * entirely by `status = 'active'`. Using the cookie-free anon client here is
 * what lets us wrap these queries in `unstable_cache` (which forbids
 * `cookies()`) and tag-revalidate them from `/api/revalidate`. The original
 * cookie-bound `createClient` is kept ONLY for the reviews helper, which
 * joins `auth.users` and respects per-user RLS.
 */
function catalogClient(): SupabaseClient {
  return createAnonServerSupabase();
}

let warnedMissingCatalogSchema = false;
let warnedCatalogNetworkIssue = false;

function isMissingCatalogTableError(msg: string | undefined): boolean {
  if (!msg) return false;
  return (
    msg.includes("Could not find the table") || msg.includes("schema cache")
  );
}

function isCatalogNetworkFetchError(msg: string | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("failed to fetch") ||
    m.includes("econnrefused") ||
    m.includes("enotfound") ||
    m.includes("getaddrinfo")
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
  if (isCatalogNetworkFetchError(message)) {
    if (!warnedCatalogNetworkIssue) {
      warnedCatalogNetworkIssue = true;
      console.warn(
        "[db] Supabase fetch failed. Check Supabase URL/keys, network access, and local env. Catalog-backed sections will temporarily fall back to empty/static data.",
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

/**
 * Card shows the cheapest variant price. Compare-at must come from that same price tier;
 * using global min(compare_at) vs min(price) can pair unrelated SKUs and hide sale badges.
 */
function cardDisplayCompareAt(
  variants: { compare_at_price: number | null; price: number }[],
): number | undefined {
  if (!variants.length) return undefined;
  const minP = Math.min(...variants.map((v) => v.price));
  const tier = variants.filter((v) => v.price === minP);
  const vals = tier
    .map((v) => v.compare_at_price)
    .filter((x): x is number => x != null && x > minP);
  if (!vals.length) return undefined;
  return Math.max(...vals);
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
  const compareAt = cardDisplayCompareAt(variants);
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
  "id, slug, name, short_description, description, status, images, tags, rating, reviews_count, stock_total, free_delivery, created_at";

/**
 * Uncached rating / review-count / tags for a product.
 * Used on the PDP so Daraz (or admin) aggregate updates show immediately even
 * when the heavier product-detail cache still holds an older snapshot.
 */
export async function dbGetProductReviewAggregates(productId: string): Promise<{
  rating: number | null;
  reviews_count: number | null;
  tags: string[] | null;
} | null> {
  if (!hasCatalogDb() || !productId) return null;
  try {
    const supabase = catalogClient();
    const { data, error } = await supabase
      .from("products")
      .select("rating, reviews_count, tags")
      .eq("id", productId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      rating: (data as { rating: number | null }).rating ?? null,
      reviews_count: (data as { reviews_count: number | null }).reviews_count ?? null,
      tags: (data as { tags: string[] | null }).tags ?? null,
    };
  } catch {
    return null;
  }
}

/** All active products with variant-derived prices (for /collections grid, sale filter). */
export async function dbListAllActiveProductsForCards(): Promise<Product[]> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = catalogClient();
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
  } catch (err) {
    // Defensive: callers like /sitemap.xml must never 500 from this helper.
    logDbCatalogIssue(
      "listAllActiveProducts",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

export async function dbListCollections(): Promise<DbCollectionRow[]> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = catalogClient();
    const { data, error } = await supabase
      .from("collections")
      .select("id, slug, name, description, hero_image, sort_order, collection_type")
      .order("sort_order", { ascending: true });
    if (error) {
      logDbCatalogIssue("listCollections", error.message);
      return [];
    }
    return (data ?? []) as DbCollectionRow[];
  } catch (err) {
    logDbCatalogIssue(
      "listCollections",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

export async function dbGetCollectionBySlug(
  slug: string,
): Promise<DbCollectionRow | null> {
  if (!hasCatalogDb()) return null;
  const supabase = catalogClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, hero_image, sort_order, collection_type")
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

  const supabase = catalogClient();

  let productIds: string[] = [];

  if (collectionIsTagBased(col.collection_type)) {
    const { data: ctRows, error: ctErr } = await supabase
      .from("collection_tags")
      .select("tag_id")
      .eq("collection_id", col.id);
    if (ctErr) {
      logDbCatalogIssue("listCollectionTags", ctErr.message);
      return [];
    }
    const tagIds = (ctRows ?? []).map((r: { tag_id: string }) => r.tag_id);
    if (!tagIds.length) return [];

    const { data: ptRows, error: ptErr } = await supabase
      .from("product_tags")
      .select("product_id")
      .in("tag_id", tagIds);
    if (ptErr) {
      logDbCatalogIssue("listProductsByTagLinks", ptErr.message);
      return [];
    }
    const seen = new Set<string>();
    for (const r of ptRows ?? []) {
      const pid = (r as { product_id: string }).product_id;
      if (!seen.has(pid)) seen.add(pid);
    }
    productIds = [...seen];
    if (!productIds.length) return [];
  } else {
    const { data: linkRows, error: linkErr } = await supabase
      .from("product_collections")
      .select("product_id")
      .eq("collection_id", col.id)
      .order("created_at", { ascending: true });
    if (linkErr) {
      logDbCatalogIssue("listProductsByCollectionLinks", linkErr.message);
      return [];
    }
    productIds = (linkRows ?? []).map((r: { product_id: string }) => r.product_id);
    if (!productIds.length) return [];
  }

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
  if (collectionIsTagBased(col.collection_type)) {
    plist.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    plist.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  return plist.map((p) =>
    mapProductCard(p, byProduct.get(p.id) ?? [], col.slug),
  );
}

export async function dbGetProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (!slugs.length || !hasCatalogDb()) return [];
  const supabase = catalogClient();
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

/** Hex/name for storefront swatches; keyed by `colors.id` from variants’ `color_id`. */
export type ProductDetailColorMeta = {
  name: string;
  hex: string | null;
};

export type ProductDetail = {
  product: DbProductRow;
  /** From `product_option_definitions`; drives PDP picker labels and layout. */
  optionDefinitions: VariantOptionSchemaEntry[];
  collectionSlug: string;
  /** Human collection name for breadcrumbs / PDP label (empty if uncategorized). */
  collectionName: string;
  variants: DbProductVariantRow[];
  assets: DbProductAssetRow[];
  colorById: Record<string, ProductDetailColorMeta>;
};

export async function dbGetProductDetailBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  if (!hasCatalogDb()) return null;
  const supabase = catalogClient();
  const { data: p, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (pErr) {
    // Throw (do not return null): unstable_cache must not store transient DB
    // failures as a 10-minute "product missing" miss.
    logDbCatalogIssue("getProductDetail", pErr.message);
    throw new Error(`getProductDetail: ${pErr.message}`);
  }
  if (!p) return null;

  const row = p as DbProductRow;

  let collectionSlug = "uncategorized";
  let collectionName = "";
  const { data: pcl } = await supabase
    .from("product_collections")
    .select("collection_id")
    .eq("product_id", row.id);
  const pcIds = (pcl ?? []).map((x: { collection_id: string }) => x.collection_id);
  if (pcIds.length) {
    const { data: cdata } = await supabase
      .from("collections")
      .select("slug, name, sort_order")
      .in("id", pcIds);
    const sorted = [...(cdata ?? [])] as {
      slug: string;
      name: string;
      sort_order: number;
    }[];
    sorted.sort((a, b) => a.sort_order - b.sort_order);
    if (sorted[0]?.slug) {
      collectionSlug = sorted[0].slug;
      collectionName = (sorted[0].name || "").trim() || sorted[0].slug;
    }
  }

  const { data: rawVariants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, option_values, price, compare_at_price, size_id, color_id")
    .eq("product_id", row.id);

  if (vErr) {
    logDbCatalogIssue("productVariants", vErr.message);
    throw new Error(`productVariants: ${vErr.message}`);
  }

  const merged = await mergeInventoryForVariants(
    supabase,
    (rawVariants ?? []) as Omit<
      DbProductVariantRow,
      "quantity_on_hand" | "quantity_reserved"
    >[],
  );

  const colorIds = [
    ...new Set(
      merged.map((v) => v.color_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  let colorById: Record<string, ProductDetailColorMeta> = {};
  if (colorIds.length) {
    const { data: colorRows, error: colErr } = await supabase
      .from("colors")
      .select("id, name, hex")
      .in("id", colorIds);
    if (colErr) {
      logDbCatalogIssue("productDetailColors", colErr.message);
    } else {
      colorById = Object.fromEntries(
        (colorRows ?? []).map((c: { id: string; name: string; hex: string | null }) => [
          c.id,
          { name: c.name, hex: c.hex },
        ]),
      );
    }
  }

  const { data: assetRows, error: aErr } = await supabase
    .from("product_assets")
    .select("id, product_id, url, kind, sort_order, alt_text")
    .eq("product_id", row.id)
    .order("sort_order", { ascending: true });

  if (aErr) {
    logDbCatalogIssue("productAssets", aErr.message);
  }

  const { data: optRows, error: optErr } = await supabase
    .from("product_option_definitions")
    .select("option_key, label, presentation, sort_order")
    .eq("product_id", row.id)
    .order("sort_order", { ascending: true });

  if (optErr) {
    logDbCatalogIssue("productOptionDefinitions", optErr.message);
  }

  return {
    product: row,
    optionDefinitions: optionDefinitionsFromDbRows(
      optRows as
        | {
            option_key: string;
            label: string;
            presentation: string;
            sort_order: number;
          }[]
        | null,
    ),
    collectionSlug,
    collectionName,
    variants: merged,
    assets: (assetRows ?? []) as DbProductAssetRow[],
    colorById,
  };
}

/**
 * When an exact slug miss happens (truncated share links, old imports), recover a
 * unique active product whose slug starts with the requested prefix.
 */
export async function dbFindUniqueActiveProductSlugByPrefix(
  prefix: string,
): Promise<string | null> {
  const p = prefix.trim();
  if (!p || p.length < 12 || !hasCatalogDb()) return null;
  const supabase = catalogClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "active")
    .like("slug", `${p}%`)
    .limit(3);
  if (error) {
    logDbCatalogIssue("findProductSlugByPrefix", error.message);
    return null;
  }
  const slugs = [...new Set((data ?? []).map((r: { slug: string }) => r.slug).filter(Boolean))];
  return slugs.length === 1 ? slugs[0] : null;
}

export async function dbSearchProducts(q: string): Promise<Product[]> {
  const term = q.trim().replace(/[,%]/g, " ");
  if (!term || !hasCatalogDb()) return [];

  const supabase = catalogClient();
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

export type HomePageSectionWithTags = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  tagIds: string[];
};

/** Active homepage sections with tag ids (OR match on storefront). */
export async function dbListActiveHomePageSectionsWithTags(): Promise<
  HomePageSectionWithTags[]
> {
  if (!hasCatalogDb()) return [];
  try {
    const supabase = catalogClient();
    const { data: sections, error } = await supabase
      .from("home_page_sections")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !sections?.length) {
      if (error) logDbCatalogIssue("listHomePageSections", error.message);
      return [];
    }
    const ids = (sections as { id: string }[]).map((s) => s.id);
    const { data: links, error: lErr } = await supabase
      .from("home_page_section_tags")
      .select("section_id, tag_id")
      .in("section_id", ids);
    if (lErr) {
      logDbCatalogIssue("listHomePageSectionTags", lErr.message);
    }
    const bySection = new Map<string, string[]>();
    for (const row of links ?? []) {
      const sid = (row as { section_id: string; tag_id: string }).section_id;
      const tid = (row as { section_id: string; tag_id: string }).tag_id;
      const arr = bySection.get(sid) ?? [];
      arr.push(tid);
      bySection.set(sid, arr);
    }
    return (
      sections as Pick<DbHomePageSectionRow, "id" | "name" | "slug" | "sort_order">[]
    ).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      sort_order: s.sort_order,
      tagIds: bySection.get(s.id) ?? [],
    }));
  } catch (err) {
    logDbCatalogIssue(
      "listHomePageSections",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

export async function dbGetActiveHomePageSectionBySlug(
  slug: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  if (!hasCatalogDb()) return null;
  const supabase = catalogClient();
  const { data, error } = await supabase
    .from("home_page_sections")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    logDbCatalogIssue("getHomePageSectionBySlug", error.message);
    return null;
  }
  return data as { id: string; name: string; slug: string } | null;
}

/** Active section by slug plus tag ids for listing and filters. */
export async function dbGetActiveHomePageSectionWithTagsBySlug(
  slug: string,
): Promise<{ id: string; name: string; slug: string; tagIds: string[] } | null> {
  if (!hasCatalogDb()) return null;
  const supabase = catalogClient();
  const { data: row, error } = await supabase
    .from("home_page_sections")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    logDbCatalogIssue("getHomePageSectionWithTags", error.message);
    return null;
  }
  if (!row) return null;
  const rid = (row as { id: string }).id;
  const { data: links, error: lErr } = await supabase
    .from("home_page_section_tags")
    .select("tag_id")
    .eq("section_id", rid);
  if (lErr) {
    logDbCatalogIssue("getHomePageSectionTagIds", lErr.message);
  }
  const tagIds = (links ?? []).map((r: { tag_id: string }) => r.tag_id);
  return { ...(row as { id: string; name: string; slug: string }), tagIds };
}

/**
 * Products for a homepage section: any product whose tags intersect `tagIds` (OR).
 * `sectionSlug` is used for card category/collection display strings.
 */
export async function dbListProductsForHomeSectionTags(
  tagIds: string[],
  sectionSlug: string,
): Promise<Product[]> {
  if (!hasCatalogDb() || !tagIds.length) return [];
  const supabase = catalogClient();

  const { data: ptRows, error: ptErr } = await supabase
    .from("product_tags")
    .select("product_id")
    .in("tag_id", tagIds);
  if (ptErr) {
    logDbCatalogIssue("listProductsByHomeSectionTagLinks", ptErr.message);
    return [];
  }
  const seen = new Set<string>();
  for (const r of ptRows ?? []) {
    seen.add((r as { product_id: string }).product_id);
  }
  const productIds = [...seen];
  if (!productIds.length) return [];

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds)
    .eq("status", "active");

  if (pErr || !products?.length) {
    if (pErr) logDbCatalogIssue("listProductsForHomeSection", pErr.message);
    return [];
  }

  const plist = products as DbProductRow[];
  const ids = plist.map((p) => p.id);
  const { data: rawVariants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, option_values, price, compare_at_price, size_id, color_id")
    .in("product_id", ids);

  if (vErr) {
    logDbCatalogIssue("variantsForHomeSection", vErr.message);
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

  const cards = plist.map((p) =>
    mapProductCard(p, byProduct.get(p.id) ?? [], sectionSlug),
  );
  return orderByRatingAndStockPriority(cards);
}

/** PDP review list — RLS shows approved to everyone; authors also see their own pending/rejected. */
export type ProductReviewPdpRow = {
  id: string;
  product_id: string;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  media: { url: string; kind: "image" | "video" }[];
  reviewer_name: string;
  /** Shown for approved reviews tied to a real account; synthetic admin reviews omit the badge. */
  show_verified_buyer: boolean;
};

function parseReviewMedia(raw: unknown): { url: string; kind: "image" | "video" }[] {
  if (!Array.isArray(raw)) return [];
  const out: { url: string; kind: "image" | "video" }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url : "";
    const kind = o.kind === "video" ? "video" : "image";
    if (url) out.push({ url, kind });
  }
  return out;
}

export async function dbListProductReviewsForPdp(
  productId: string,
): Promise<ProductReviewPdpRow[]> {
  if (!hasCatalogDb()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      product_id,
      user_id,
      attributed_display_name,
      attributed_display_email,
      rating,
      title,
      body,
      status,
      created_at,
      media,
      users ( first_name, last_name )
    `,
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    logDbCatalogIssue("dbListProductReviewsForPdp", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const rawU = row.users;
    const u = (
      Array.isArray(rawU) ? rawU[0] : rawU
    ) as { first_name?: string; last_name?: string } | null | undefined;
    const userId = row.user_id as string | null | undefined;
    const attributedName =
      typeof row.attributed_display_name === "string" ? row.attributed_display_name.trim() : "";
    const fromProfile = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
    const reviewer_name =
      attributedName ||
      fromProfile ||
      (typeof row.attributed_display_email === "string" && row.attributed_display_email.trim()
        ? row.attributed_display_email.trim()
        : "Customer");
    const st = row.status as string;
    const status: ProductReviewPdpRow["status"] =
      st === "approved" || st === "rejected" || st === "pending" ? st : "pending";
    const show_verified_buyer = status === "approved" && Boolean(userId);
    return {
      id: String(row.id),
      product_id: String(row.product_id),
      rating: Number(row.rating ?? 0),
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      status,
      created_at: String(row.created_at ?? ""),
      media: parseReviewMedia(row.media),
      reviewer_name,
      show_verified_buyer,
    };
  });
}
