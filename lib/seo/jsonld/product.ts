/**
 * Product/Offer JSON-LD generator. Inputs are deliberately storefront-side
 * `ProductDetail` shapes; the function does not query the DB.
 *
 * Notes on Google rich results:
 *   - We emit a single `Product` with `AggregateOffer` when there are multiple
 *     variants with distinct prices (preferred — fewer false "out of stock" flags).
 *   - `aggregateRating` is included ONLY if `reviewCount >= 1` AND the storefront
 *     does not flag the reviews dataset as synthetic (the `Product Reviews System`
 *     punishes fake-review markup).
 *   - `gtin`/`mpn`/`brand` are emitted when populated — they unlock Shopping
 *     enrichment.
 *   - `sku` MUST be unique on the page, so we use the product's id.
 */

import type {
  DbProductAssetRow,
  DbProductRow,
  DbProductVariantRow,
} from "@/app/lib/db/types";
import { absoluteUrl } from "../canonical";
import { stripHtml } from "../text";
import type { SiteIdentity } from "../types";
import { getPublicSiteUrl } from "@/lib/site-url";

export type ProductJsonLdInput = {
  product: DbProductRow;
  variants: DbProductVariantRow[];
  assets: DbProductAssetRow[];
  identity: SiteIdentity;
  /** Canonical URL of the PDP. */
  url: string;
  /** Brand override (when admin sets `products.brand_name`). */
  brandName?: string;
  gtin?: string;
  mpn?: string;
  /** When true, omit aggregateRating (synthetic-review safe mode). */
  reviewsAreSynthetic?: boolean;
};

function uniqueImages(input: ProductJsonLdInput): string[] {
  const out = new Set<string>();
  if (Array.isArray(input.assets)) {
    for (const a of input.assets) {
      if (a.kind === "image" && a.url) out.add(absoluteUrl(a.url));
    }
  }
  // products.images may be an array or array-like JSON.
  const raw = input.product.images;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string" && item) out.add(absoluteUrl(item));
      else if (
        item &&
        typeof item === "object" &&
        typeof (item as { url?: unknown }).url === "string"
      ) {
        out.add(absoluteUrl((item as { url: string }).url));
      }
    }
  }
  return [...out].slice(0, 8);
}

function pricesOf(variants: DbProductVariantRow[]): {
  low: number | null;
  high: number | null;
  count: number;
  anyAvailable: boolean;
} {
  if (!variants.length) return { low: null, high: null, count: 0, anyAvailable: false };
  let low = Infinity;
  let high = -Infinity;
  let anyAvailable = false;
  for (const v of variants) {
    const p = Number(v.price);
    if (Number.isFinite(p)) {
      if (p < low) low = p;
      if (p > high) high = p;
    }
    const stock = Math.max(0, (v.quantity_on_hand ?? 0) - (v.quantity_reserved ?? 0));
    if (stock > 0) anyAvailable = true;
  }
  if (low === Infinity || high === -Infinity) {
    return { low: null, high: null, count: variants.length, anyAvailable };
  }
  return { low, high, count: variants.length, anyAvailable };
}

/**
 * Builds the Offer / AggregateOffer node for the product. Uses store currency.
 */
function buildOffer(
  input: ProductJsonLdInput,
): Record<string, unknown> | null {
  const { variants, identity, url } = input;
  if (!variants.length) return null;
  const { low, high, count, anyAvailable } = pricesOf(variants);
  if (low == null || high == null) return null;
  const availability = anyAvailable
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const currency = identity.currency || "PKR";
  const sellerRef = { "@id": `${getPublicSiteUrl()}/#organization` };

  const single = count === 1 || low === high;
  if (single) {
    const v = variants[0];
    return {
      "@type": "Offer",
      url,
      price: low.toFixed(2),
      priceCurrency: currency,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: sellerRef,
      sku: v.sku || undefined,
      priceValidUntil: priceValidUntilFromNow(),
    };
  }
  return {
    "@type": "AggregateOffer",
    url,
    priceCurrency: currency,
    lowPrice: low.toFixed(2),
    highPrice: high.toFixed(2),
    offerCount: count,
    availability,
    itemCondition: "https://schema.org/NewCondition",
    seller: sellerRef,
    priceValidUntil: priceValidUntilFromNow(),
  };
}

function priceValidUntilFromNow(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCMonth(11, 31);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function productJsonLd(input: ProductJsonLdInput): Record<string, unknown> {
  const { product, identity, url, brandName, gtin, mpn, reviewsAreSynthetic } = input;
  const description = stripHtml(product.description) || stripHtml(product.short_description) || "";
  const images = uniqueImages(input);

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: description || undefined,
    image: images.length ? images : undefined,
    sku: product.id,
    url,
    brand: {
      "@type": "Brand",
      name:
        (brandName ?? "").trim() ||
        identity.organizationLegalName.trim() ||
        identity.storeName.trim() ||
        identity.siteTitle.trim() ||
        "Store",
    },
  };

  if (gtin && gtin.trim()) node.gtin = gtin.trim();
  if (mpn && mpn.trim()) node.mpn = mpn.trim();

  const offer = buildOffer(input);
  if (offer) node.offers = offer;

  const rating = Number(product.rating ?? 0);
  const count = Number(product.reviews_count ?? 0);
  if (!reviewsAreSynthetic && count >= 1 && rating >= 1 && rating <= 5) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(1),
      reviewCount: count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return node;
}
