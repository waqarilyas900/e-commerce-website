/**
 * Latest approved product reviews for the homepage Rad-style reviews split.
 * Shares the same loader as `/customer-reviews` so homepage and that page cannot
 * diverge (and we avoid a separate cache that can stick on an empty miss).
 */

import {
  getCachedStoreReviewsPage,
  type StoreReviewRow,
} from "@/lib/cache/store-reviews-page";

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

const HIGHLIGHT_LIMIT = 14;

function toHighlight(row: StoreReviewRow): HomeReviewHighlight {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    reviewerName: row.reviewerName,
    productSlug: row.productSlug,
    productName: row.productName,
    productImage: row.productImage,
  };
}

export async function getCachedHomeReviewHighlights(): Promise<HomeReviewHighlight[]> {
  const page = await getCachedStoreReviewsPage({
    page: 1,
    pageSize: HIGHLIGHT_LIMIT,
    sort: "newest",
  });
  return page.reviews.map(toHighlight);
}
