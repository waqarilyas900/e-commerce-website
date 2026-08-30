"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/app/providers/cart-provider";
import {
  defaultMetaCurrency,
  metaContentsSingleItem,
  resolveVariantTrackingId,
  toPkrValue,
  trackMetaPixel,
} from "@/lib/seo/meta-pixel-client";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { toastAddedToCart } from "@/lib/cart-toast";
import { ADD_TO_CART_BUTTON_MS, delayMs } from "@/lib/cart-add-feedback";
import type { Product } from "@/app/lib/catalog/types";

type Props = {
  /** When missing (bad rail data), the button renders nothing. */
  product?: Product;
  className?: string;
  label?: string;
  openDrawer?: boolean;
  quantity?: number;
};

/** PLP quick-add: uses cheapest variant when `defaultVariantId` is set (DB catalog). */
export function AddToCartButton({
  product,
  className = "w-full",
  label = "Add to cart",
  openDrawer = true,
  quantity = 1,
}: Props) {
  const { addVariant, openCart } = useCart();
  const [adding, setAdding] = useState(false);
  const q = Math.min(99, Math.max(1, Math.floor(quantity)));

  if (!product) {
    return null;
  }

  if (!product.defaultVariantId) {
    return (
      <Link
        href={`/products/${product.slug}`}
        className={
          "btn inline-flex w-full cursor-pointer items-center justify-center !rounded-none border border-neutral-900 bg-transparent text-center text-neutral-900 transition-colors hover:bg-neutral-950 hover:text-white " +
          className
        }
      >
        Choose options
      </Link>
    );
  }

  return (
    <PrimaryActionButton
      className={className}
      loading={adding}
      onClick={async () => {
        if (adding) return;
        setAdding(true);
        try {
          await delayMs(ADD_TO_CART_BUTTON_MS);
          const variantId = product.defaultVariantId!;
          const trackingId =
            (product.defaultVariantSku || "").trim() ||
            resolveVariantTrackingId({ id: variantId }, variantId);
          addVariant(variantId, product.id, q);
          trackMetaPixel("AddToCart", {
            content_ids: [trackingId],
            contents: metaContentsSingleItem({
              id: trackingId,
              quantity: q,
              item_price: product.price,
            }),
            content_type: "product",
            content_name: product.name,
            currency: defaultMetaCurrency(),
            value: toPkrValue(product.price * q),
            num_items: q,
          });
          toastAddedToCart({
            description: q > 1 ? `${product.name} · ${q} added` : product.name,
            quantity: q,
          });
          if (openDrawer) openCart();
        } finally {
          setAdding(false);
        }
      }}
    >
      {label}
    </PrimaryActionButton>
  );
}
