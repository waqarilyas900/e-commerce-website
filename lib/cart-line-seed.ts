import type { CartLineSeed } from "@/app/providers/cart-provider";
import type { Product } from "@/app/lib/catalog/types";

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

export function formatVariantLabelFromOptions(
  option_values: Record<string, string>,
): string {
  const entries = Object.entries(option_values);
  if (!entries.length) return "";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

export function cartSeedFromPdp(params: {
  product: {
    id: string;
    slug: string;
    name: string;
    images?: unknown;
    free_delivery?: boolean | null;
  };
  variant: {
    id: string;
    sku?: string | null;
    price: number | string;
    compare_at_price?: number | string | null;
    option_values?: Record<string, string> | null;
  };
}): CartLineSeed {
  const sku = String(params.variant.sku ?? "").trim();
  const unitPrice = Number(params.variant.price);
  const compareAtRaw = params.variant.compare_at_price;
  const compareAtPrice =
    compareAtRaw != null && compareAtRaw !== "" ? Number(compareAtRaw) : undefined;
  return {
    unitPrice,
    compareAtPrice,
    product: {
      id: params.product.id,
      slug: params.product.slug,
      name: params.product.name,
      image: firstImage(params.product.images),
      freeDelivery: Boolean(params.product.free_delivery),
    },
    variantLabel: formatVariantLabelFromOptions(params.variant.option_values ?? {}),
    sku: sku || undefined,
    trackingId: sku || params.variant.id,
  };
}

/** PLP quick-add — omits variant label / free-delivery until background resolve. */
export function cartSeedFromProduct(product: Product): CartLineSeed | undefined {
  if (!product.defaultVariantId) return undefined;
  const sku = (product.defaultVariantSku ?? "").trim();
  return {
    unitPrice: product.price,
    compareAtPrice: product.compareAtPrice,
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      freeDelivery: false,
    },
    variantLabel: "",
    sku: sku || undefined,
    trackingId: sku || product.defaultVariantId,
  };
}
