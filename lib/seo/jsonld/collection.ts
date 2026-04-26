import type { Product } from "@/app/lib/catalog/types";
import { absoluteUrl } from "../canonical";
import { stripHtml } from "../text";

export type CollectionItemListInput = {
  url: string;
  name: string;
  description?: string;
  /** Already-sorted, already-paged list. We emit position by index. */
  products: Product[];
  /** Limit emitted nodes (Google ignores > ~100; default 50). */
  limit?: number;
};

/**
 * `CollectionPage` containing an `ItemList` of products. Items are URL refs only —
 * each PDP carries the full Product JSON-LD, so we don't duplicate it here.
 */
export function collectionJsonLd(
  input: CollectionItemListInput,
): Record<string, unknown> {
  const list = (input.products ?? []).slice(0, input.limit ?? 50);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${input.url}#collection`,
    url: input.url,
    name: input.name,
    description: input.description ? stripHtml(input.description) : undefined,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: list.length,
      itemListElement: list.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/products/${p.slug}`),
        name: p.name,
      })),
    },
  };
}
