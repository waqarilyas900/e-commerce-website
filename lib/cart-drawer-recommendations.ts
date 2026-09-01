import type { Product } from "@/app/lib/catalog/types";
import { hasCatalogDb } from "@/app/lib/db/env";

const LIMIT = 2;

let cached: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;

export function getCachedCartDrawerRecommendations(): Product[] | null {
  return cached;
}

/** Warm recommendations in the background so empty-cart drawer opens instantly. */
export function prefetchCartDrawerRecommendations(): void {
  if (!hasCatalogDb() || cached || inflight) return;
  void loadCartDrawerRecommendations();
}

export async function loadCartDrawerRecommendations(): Promise<Product[]> {
  if (cached) return cached;
  if (inflight) return inflight;
  if (!hasCatalogDb()) {
    cached = [];
    return cached;
  }

  inflight = fetch(`/api/catalog/random-products?limit=${LIMIT}`)
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      cached = Array.isArray(data) ? (data as Product[]) : [];
      return cached;
    })
    .catch(() => {
      cached = [];
      return cached;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
