/**
 * Store-wide review headline stats for the homepage trust strip.
 * Uses denormalized `products.reviews_count` (marketplace totals when locked)
 * so the trust bar matches product cards / PDP.
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

  let totalReviews = 0;
  let weighted = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("rating, reviews_count")
      .eq("status", "active")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) {
      console.warn("[store-review-aggregate]", error.message);
      return ZERO_AGGREGATE;
    }
    if (!data?.length) break;
    for (const row of data) {
      const count = Math.max(0, Number(row.reviews_count ?? 0));
      if (count <= 0) continue;
      const rating = Number(row.rating ?? 0);
      totalReviews += count;
      weighted += rating * count;
    }
    if (data.length < 1000) break;
  }

  if (totalReviews <= 0) return ZERO_AGGREGATE;
  const averageRating = Math.round((weighted / totalReviews) * 10) / 10;
  return { averageRating, totalReviews };
}

/** Tagged so admin / storefront review changes refresh the homepage rating bar. */
export async function getCachedStoreReviewAggregate(): Promise<StoreReviewAggregate> {
  return unstable_cache(loadStoreReviewAggregateUncached, ["store-review-aggregate-v5"], {
    revalidate: TTL_SECONDS,
    tags: [CATALOG_CACHE_TAGS.storeReviewAggregate, CATALOG_CACHE_TAGS.products],
  })();
}
