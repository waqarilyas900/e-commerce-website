/**
 * Store-wide review headline stats for the homepage trust strip.
 * Source of truth: approved rows in `reviews` (not denormalized product counters,
 * which stay 0 when stats are locked or after bulk imports).
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

  // Same approach as store review breakdown — 5 cheap HEAD counts, no row scan.
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

  let totalReviews = 0;
  let weighted = 0;
  for (let i = 0; i < stars.length; i++) {
    const c = results[i]?.count ?? 0;
    if (c <= 0) continue;
    totalReviews += c;
    weighted += stars[i] * c;
  }
  if (totalReviews <= 0) return ZERO_AGGREGATE;

  const averageRating = Math.round((weighted / totalReviews) * 10) / 10;
  return { averageRating, totalReviews };
}

/** Tagged so admin / storefront review changes refresh the homepage rating bar. */
export async function getCachedStoreReviewAggregate(): Promise<StoreReviewAggregate> {
  return unstable_cache(loadStoreReviewAggregateUncached, ["store-review-aggregate-v4"], {
    revalidate: TTL_SECONDS,
    tags: [CATALOG_CACHE_TAGS.storeReviewAggregate, CATALOG_CACHE_TAGS.products],
  })();
}
