/**
 * Latest approved product reviews for the homepage Rad-style reviews split.
 */

import { unstable_cache } from "next/cache";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";
import { hasCatalogDb } from "@/app/lib/db/env";
import { CATALOG_CACHE_TAGS } from "@/lib/cache/catalog-data";

export type HomeReviewHighlight = {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  reviewerName: string;
  productSlug: string;
  productName: string;
  productImage: string;
};

const TTL_SECONDS = 60 * 10;
const HIGHLIGHT_LIMIT = 14;

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

async function loadHomeReviewHighlightsUncached(): Promise<HomeReviewHighlight[]> {
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
      created_at,
      attributed_display_name,
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
    .limit(HIGHLIGHT_LIMIT);

  if (error || !data?.length) {
    if (error) {
      console.warn("[home-reviews]", error.message);
    }
    return [];
  }

  const out: HomeReviewHighlight[] = [];
  for (const row of data) {
    const rawP = row.products;
    const p = (Array.isArray(rawP) ? rawP[0] : rawP) as
      | { slug?: string; name?: string; images?: unknown; status?: string }
      | null
      | undefined;
    if (!p || p.status !== "active") continue;
    const slug = typeof p.slug === "string" ? p.slug.trim() : "";
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (!slug || !name) continue;
    const attributed =
      typeof row.attributed_display_name === "string"
        ? row.attributed_display_name.trim()
        : "";
    const body = String(row.body ?? "").trim();
    let title = String(row.title ?? "").trim();
    // Marketplace sync sometimes stores ISO dates as titles — hide those.
    if (/^\d{4}-\d{2}-\d{2}/.test(title) || title === body) title = "";
    if (!body && !title) continue;
    out.push({
      id: String(row.id),
      rating: Math.max(0, Math.min(5, Number(row.rating ?? 0))),
      title,
      body: body || title,
      createdAt: String(row.created_at ?? ""),
      reviewerName: attributed || "Customer",
      productSlug: slug,
      productName: name,
      productImage: firstImage(p.images),
    });
  }
  return out;
}

export async function getCachedHomeReviewHighlights(): Promise<HomeReviewHighlight[]> {
  return unstable_cache(loadHomeReviewHighlightsUncached, ["home-review-highlights-v2"], {
    revalidate: TTL_SECONDS,
    tags: [CATALOG_CACHE_TAGS.storeReviewAggregate, CATALOG_CACHE_TAGS.products],
  })();
}
