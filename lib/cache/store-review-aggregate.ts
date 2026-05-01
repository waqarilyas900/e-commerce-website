/**
 * Store-wide review headline stats for the homepage trust strip.
 * Uses denormalized `products.rating` × `products.reviews_count` (same signals as PLP cards).
 */

import { unstable_cache } from "next/cache";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";
import { hasCatalogDb } from "@/app/lib/db/env";
import { CATALOG_CACHE_TAGS } from "@/lib/cache/catalog-data";

export type StoreReviewAggregate = {
  averageRating: number;
  totalReviews: number;
};

const TTL_SECONDS = 60 * 10;

const ZERO_AGGREGATE: StoreReviewAggregate = { averageRating: 0, totalReviews: 0 };

async function loadStoreReviewAggregateUncached(): Promise<StoreReviewAggregate> {
  if (!hasCatalogDb()) return ZERO_AGGREGATE;
  const supabase = createAnonServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("rating, reviews_count")
    .eq("status", "active");
  if (error || !data?.length) return ZERO_AGGREGATE;

  let totalReviews = 0;
  let weighted = 0;
  for (const row of data) {
    const c = Math.max(0, Math.floor(Number(row.reviews_count ?? 0)));
    const r = Number(row.rating ?? 0);
    if (c <= 0 || !Number.isFinite(r) || r <= 0) continue;
    totalReviews += c;
    weighted += r * c;
  }
  if (totalReviews <= 0) return ZERO_AGGREGATE;

  const averageRating = Math.round((weighted / totalReviews) * 10) / 10;
  return { averageRating, totalReviews };
}

/** Tagged with `catalog:products` so admin product saves refresh homepage rating bar. Always resolves (uses 0 / 0 when there is no review data). */
export async function getCachedStoreReviewAggregate(): Promise<StoreReviewAggregate> {
  return unstable_cache(loadStoreReviewAggregateUncached, ["store-review-aggregate-v2"], {
    revalidate: TTL_SECONDS,
    tags: [CATALOG_CACHE_TAGS.products],
  })();
}
