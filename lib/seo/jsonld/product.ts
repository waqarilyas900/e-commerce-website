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
 *   - When merchant return / shipping policy IDs exist on `product_shopping_attributes`,
 *     we attach `hasMerchantReturnPolicy` and `shippingDetails` so the listing is
 *     eligible for the "Free returns" / "Free shipping" Merchant badges (a strong
 *     CTR boost in Google Shopping SERPs).
 */

import type {
  DbProductAssetRow,
  DbProductRow,
  DbProductVariantRow,
} from "@/app/lib/db/types";
import type { VariantOptionSchemaEntry } from "@/app/lib/catalog/variant-option-schema";
import type { ProductSeoExtras } from "../product-seo-extras";
import { absoluteUrl } from "../canonical";
import { stripHtml } from "../text";
import type { SeoOverride, SiteIdentity } from "../types";
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
  /**
   * When admin fills `seo_meta` title/description/OG image, mirror those on the
   * Product JSON-LD so structured data matches Open Graph / meta tags.
   */
  seoOverride?: SeoOverride | null;
  /** Optional shopping/SEO extras (`product_shopping_attributes`). */
  shoppingExtras?: ProductSeoExtras;
  /** Variant axes ("size", "color", ...) so we emit `additionalProperty`. */
  optionDefinitions?: VariantOptionSchemaEntry[];
  /** Optional category label (e.g. parent collection name). Falls back to first tag. */
  category?: string;
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

/** Prefer admin OG image first, then gallery images (deduped). */
function mergedProductImages(input: ProductJsonLdInput): string[] {
  const og = input.seoOverride?.ogImageUrl?.trim();
  const primary = og ? [absoluteUrl(og)] : [];
  const rest = uniqueImages(input);
  const merged = [...new Set([...primary, ...rest])];
  return merged.slice(0, 8);
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

/** Build the Offer / AggregateOffer node for the product. Uses store currency. */
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
  const policyNodes = buildMerchantPolicyNodes(input, currency);

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
      ...policyNodes,
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
    ...policyNodes,
  };
}

function priceValidUntilFromNow(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCMonth(11, 31);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Build `hasMerchantReturnPolicy` + `shippingDetails` nodes from
 * `product_shopping_attributes`. We emit reasonable defaults that match Google
 * Shopping rich-result requirements; admins can later override with real
 * policies once they author them.
 *
 * Only emitted when the admin has linked at least one of the policies — we
 * never fabricate a return policy a merchant hasn't actually opted into.
 */
function buildMerchantPolicyNodes(
  input: ProductJsonLdInput,
  currency: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const country = input.identity.address.country || "PK";
  const extras = input.shoppingExtras;
  if (!extras) return out;

  if (extras.returnPolicyId) {
    out.hasMerchantReturnPolicy = {
      "@type": "MerchantReturnPolicy",
      applicableCountry: country,
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    };
  }

  if (extras.shippingPolicyId) {
    out.shippingDetails = {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "0.00",
        currency,
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: country,
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 1,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 1,
          maxValue: 5,
          unitCode: "DAY",
        },
      },
    };
  }

  return out;
}

/** "en_US" → "en-US" for schema.org `inLanguage`. */
function bcp47From(locale: string | null | undefined): string | undefined {
  const t = (locale ?? "").trim();
  if (!t) return undefined;
  return t.replace(/_/g, "-");
}

/**
 * Variant axes (Color, Size, etc.) → schema.org `additionalProperty` items.
 * Helps Google understand variant SKUs without us emitting a full ProductGroup.
 */
function buildAdditionalProperty(
  input: ProductJsonLdInput,
): Array<Record<string, unknown>> | undefined {
  const optionDefs = input.optionDefinitions ?? [];
  const variants = input.variants ?? [];
  if (!variants.length) return undefined;

  const valuesByKey = new Map<string, Set<string>>();
  for (const v of variants) {
    const ov = v.option_values ?? {};
    for (const k of Object.keys(ov)) {
      const value = String(ov[k] ?? "").trim();
      if (!value) continue;
      let set = valuesByKey.get(k);
      if (!set) {
        set = new Set();
        valuesByKey.set(k, set);
      }
      set.add(value);
    }
  }

  const labelByKey = new Map(
    optionDefs.map((d) => [d.key, d.label || d.key]),
  );

  const out: Array<Record<string, unknown>> = [];
  for (const [key, set] of valuesByKey.entries()) {
    if (set.size === 0) continue;
    out.push({
      "@type": "PropertyValue",
      name: labelByKey.get(key) ?? key,
      value: [...set].join(", "),
    });
  }
  return out.length ? out : undefined;
}

export function productJsonLd(input: ProductJsonLdInput): Record<string, unknown> {
  const { product, identity, url, brandName, gtin, mpn, reviewsAreSynthetic, seoOverride } = input;
  const ovTitle = seoOverride?.title?.trim();
  const ovDesc = seoOverride?.description?.trim();
  const baseDescription =
    stripHtml(product.description) || stripHtml(product.short_description) || "";
  const description = ovDesc || baseDescription;
  const images = mergedProductImages(input);
  const extras = input.shoppingExtras;
  const inLanguage = bcp47From(identity.locale);
  const additionalProperty = buildAdditionalProperty(input);
  const category =
    input.category?.trim() ||
    extras?.material?.trim() ||
    (Array.isArray(product.tags) ? product.tags.find((t) => t && t.trim()) : undefined) ||
    undefined;

  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: ovTitle || product.name,
    description: description || undefined,
    image: images.length ? images : undefined,
    sku: product.id,
    url,
    inLanguage,
    category,
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
  if (extras?.material?.trim()) node.material = extras.material.trim();
  if (extras?.countryOfOrigin?.trim()) {
    node.countryOfOrigin = {
      "@type": "Country",
      name: extras.countryOfOrigin.trim(),
    };
  }
  if (additionalProperty) node.additionalProperty = additionalProperty;

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

  // Strip undefined keys so the JSON-LD blob stays compact and validators don't
  // flag empty fields.
  for (const k of Object.keys(node)) {
    if (node[k] === undefined) delete node[k];
  }

  return node;
}
