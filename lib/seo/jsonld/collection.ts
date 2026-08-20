import type { Product } from "@/app/lib/catalog/types";
import { absoluteUrl } from "../canonical";
import { stripHtml } from "../text";

export type CollectionItemListInput = {
  url: string;
  name: string;
  description?: string;
  /** Visible list on the page (filtered/sorted). We emit position by index. */
  products: Product[];
  /** Limit emitted nodes (Google ignores > ~100; default 50). */
  limit?: number;
  /**
   * Full catalog size for `numberOfItems` when the page shows a filtered/sorted
   * slice — defaults to the emitted list length.
   */
  totalItemCount?: number;
  /** Optional breadcrumb @id when paired with a separate `BreadcrumbList`. */
  breadcrumbId?: string;
};

/**
 * `CollectionPage` containing an `ItemList` of products. Items are URL refs only —
 * each PDP carries the full Product JSON-LD, so we don't duplicate it here.
 */
export function collectionJsonLd(
  input: CollectionItemListInput,
): Record<string, unknown> {
  const list = (input.products ?? []).slice(0, input.limit ?? 50);
  const numberOfItems =
    typeof input.totalItemCount === "number" && input.totalItemCount > 0
      ? input.totalItemCount
      : list.length;
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${input.url}#collection`,
    url: input.url,
    name: input.name,
    description: input.description ? stripHtml(input.description) : undefined,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems,
      itemListElement: list.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/products/${p.slug}`),
        name: p.name,
      })),
    },
  };
  if (input.breadcrumbId) {
    node.breadcrumb = { "@id": input.breadcrumbId };
  }
  return node;
}
