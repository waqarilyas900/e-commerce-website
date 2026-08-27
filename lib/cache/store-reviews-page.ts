/**
 * Store-wide approved reviews for /customer-reviews (Rad-style all-reviews page).
 */

import { unstable_cache } from "next/cache";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";
import { hasCatalogDb } from "@/app/lib/db/env";
import { CATALOG_CACHE_TAGS } from "@/lib/cache/catalog-data";
import type { HomeReviewHighlight } from "@/lib/cache/home-review-highlights";

export type StoreReviewSort =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

export type StoreReviewBreakdown = {
  /** Index 0 = 5★ … index 4 = 1★ */
  counts: [number, number, number, number, number];
  total: number;
};

export type StoreReviewRow = HomeReviewHighlight & {
  verifiedBuyer: boolean;
  mediaUrls?: string[];
  productVariant?: string;
};

export type StoreReviewsPageResult = {
  reviews: StoreReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** One gallery/lightbox slide — preferably a customer-uploaded review photo. */
export type ReviewMediaItem = {
  /** Unique slide id (`reviewId` + media index). */
  id: string;
  reviewId: string;
  /** Large lightbox / thumb image (customer media when available). */
  image: string;
  /** Catalog product image for the “Review for” card. */
  productImage: string;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  verifiedBuyer: boolean;
  productSlug: string;
  productName: string;
};

const TTL_SECONDS = 60 * 5;
/** 4×4 grid matches Judge.me / Rad all-reviews layout on desktop. */
const DEFAULT_PAGE_SIZE = 16;
const MEDIA_GALLERY_LIMIT = 40;

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

function parseReviewMediaUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const kind = o.kind === "video" ? "video" : "image";
    if (url && kind === "image") out.push(url);
  }
  return out;
}

function cleanTitle(title: string, body: string): string {
  let t = title.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t) || t === body.trim() || t.startsWith("daraz:")) t = "";
  return t;
}

function mapRow(row: Record<string, unknown>): StoreReviewRow | null {
  const rawP = row.products;
  const p = (Array.isArray(rawP) ? rawP[0] : rawP) as
    | { slug?: string; name?: string; images?: unknown; status?: string }
    | null
    | undefined;
  if (!p || p.status !== "active") return null;
  const slug = typeof p.slug === "string" ? p.slug.trim() : "";
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!slug || !name) return null;
  const attributed =
    typeof row.attributed_display_name === "string"
      ? row.attributed_display_name.trim()
      : "";
  const body = String(row.body ?? "").trim();
  const title = cleanTitle(String(row.title ?? ""), body);
  if (!body && !title) return null;
  const mediaUrls = parseReviewMediaUrls(row.media);
  return {
    id: String(row.id),
    rating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
    title,
    body: body || title,
    createdAt: String(row.created_at ?? ""),
    reviewerName: attributed || "Customer",
    productSlug: slug,
    productName: name,
    productImage: firstImage(p.images),
    verifiedBuyer: Boolean(row.user_id),
    mediaUrls,
  };
}

async function loadBreakdownUncached(): Promise<StoreReviewBreakdown> {
  const empty: StoreReviewBreakdown = { counts: [0, 0, 0, 0, 0], total: 0 };
  if (!hasCatalogDb()) return empty;
  const supabase = createAnonServerSupabase();
  const stars = [5, 4, 3, 2, 1] as const;
  const results = await Promise.all(
    stars.map((star) =>
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("rating", star),
    ),
  );
  const counts = [0, 0, 0, 0, 0] as StoreReviewBreakdown["counts"];
  let total = 0;
  results.forEach((res, i) => {
    const c = res.count ?? 0;
    counts[i] = c;
    total += c;
  });
  return { counts, total };
}

export async function getCachedStoreReviewBreakdown(): Promise<StoreReviewBreakdown> {
  return unstable_cache(loadBreakdownUncached, ["store-review-breakdown-v1"], {
    revalidate: TTL_SECONDS,
    tags: [CATALOG_CACHE_TAGS.storeReviewAggregate, CATALOG_CACHE_TAGS.products],
  })();
}

async function loadReviewsPageUncached(
  page: number,
  pageSize: number,
  sort: StoreReviewSort,
  starFilter: number | null,
): Promise<StoreReviewsPageResult> {
  const empty: StoreReviewsPageResult = {
    reviews: [],
    total: 0,
    page: 1,
    pageSize,
    pageCount: 0,
  };
  if (!hasCatalogDb()) return empty;

  const supabase = createAnonServerSupabase();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      title,
      body,
      created_at,
      attributed_display_name,
      user_id,
      media,
      products!inner (
        slug,
        name,
        images,
        status
      )
    `,
      { count: "exact" },
    )
    .eq("status", "approved")
    .eq("products.status", "active");

  if (starFilter != null && starFilter >= 1 && starFilter <= 5) {
    q = q.eq("rating", starFilter);
  }

  if (sort === "oldest") q = q.order("created_at", { ascending: true });
  else if (sort === "highest") {
    q = q.order("rating", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "lowest") {
    q = q.order("rating", { ascending: true }).order("created_at", { ascending: false });
  } else {
    q = q.order("created_at", { ascending: false });
  }

  const { data, error, count } = await q.range(from, to);
  if (error) {
    console.warn("[store-reviews-page]", error.message);
    return empty;
  }

  const total = count ?? 0;
  const reviews = (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter(Boolean) as (HomeReviewHighlight & { verifiedBuyer: boolean })[];

  return {
    reviews,
    total,
    page: safePage,
    pageSize,
    pageCount: total > 0 ? Math.ceil(total / pageSize) : 0,
  };
}

export async function getCachedStoreReviewsPage(opts: {
  page?: number;
  pageSize?: number;
  sort?: StoreReviewSort;
  star?: number | null;
}): Promise<StoreReviewsPageResult> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const sort = opts.sort ?? "newest";
  const star = opts.star ?? null;
  const key = `store-reviews-page-v1-${page}-${pageSize}-${sort}-${star ?? "all"}`;
  return unstable_cache(
    () => loadReviewsPageUncached(page, pageSize, sort, star),
    [key],
    {
      revalidate: TTL_SECONDS,
      tags: [CATALOG_CACHE_TAGS.storeReviewAggregate, CATALOG_CACHE_TAGS.products],
    },
  )();
}

async function loadReviewMediaGalleryUncached(): Promise<ReviewMediaItem[]> {
  if (!hasCatalogDb()) return [];
  const supabase = createAnonServerSupabase();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      title,
      body,
      attributed_display_name,
      user_id,
      media,
      products!inner (
        slug,
        name,
        images,
        status
      )
    `,
    )
    .eq("status", "approved")
    .eq("products.status", "active")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error || !data?.length) {
    if (error) console.warn("[review-media-gallery]", error.message);
    return [];
  }

  const withCustomerMedia: ReviewMediaItem[] = [];
  const productFallback: ReviewMediaItem[] = [];
  const seenProduct = new Set<string>();

  for (const row of data) {
    const mapped = mapRow(row as Record<string, unknown>);
    if (!mapped) continue;
    const mediaUrls = parseReviewMediaUrls((row as { media?: unknown }).media);
    const productImage = mapped.productImage;

    if (mediaUrls.length > 0) {
      mediaUrls.forEach((url, mediaIdx) => {
        if (withCustomerMedia.length >= MEDIA_GALLERY_LIMIT) return;
        withCustomerMedia.push({
          id: `${mapped.id}-${mediaIdx}`,
          reviewId: mapped.id,
          image: url,
          productImage: productImage || url,
          rating: mapped.rating,
          title: mapped.title,
          body: mapped.body,
          reviewerName: mapped.reviewerName,
          verifiedBuyer: mapped.verifiedBuyer,
          productSlug: mapped.productSlug,
          productName: mapped.productName,
        });
      });
      continue;
    }

    // Fallback only when we don't have enough customer photos yet
    if (!productImage || seenProduct.has(mapped.productSlug)) continue;
    seenProduct.add(mapped.productSlug);
    productFallback.push({
      id: `${mapped.id}-product`,
      reviewId: mapped.id,
      image: productImage,
      productImage,
      rating: mapped.rating,
      title: mapped.title,
      body: mapped.body,
      reviewerName: mapped.reviewerName,
      verifiedBuyer: mapped.verifiedBuyer,
      productSlug: mapped.productSlug,
      productName: mapped.productName,
    });
  }

  if (withCustomerMedia.length >= 8) {
    return withCustomerMedia.slice(0, MEDIA_GALLERY_LIMIT);
  }
  // Mix: customer media first, then unique product images to fill the grid
  const out = [...withCustomerMedia];
  for (const item of productFallback) {
    if (out.length >= MEDIA_GALLERY_LIMIT) break;
    out.push(item);
  }
  return out;
}

export async function getCachedReviewMediaGallery(): Promise<ReviewMediaItem[]> {
  return unstable_cache(loadReviewMediaGalleryUncached, ["review-media-gallery-v2"], {
    revalidate: TTL_SECONDS,
    tags: [CATALOG_CACHE_TAGS.storeReviewAggregate, CATALOG_CACHE_TAGS.products],
  })();
}

export { DEFAULT_PAGE_SIZE };
