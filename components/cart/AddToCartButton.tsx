"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/app/providers/cart-provider";
import { defaultMetaCurrency, toPkrValue, trackMetaPixel } from "@/lib/seo/meta-pixel-client";
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
  className = "w-full rounded-md py-2 text-xs sm:text-sm",
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
          "inline-flex cursor-pointer items-center justify-center rounded-md border border-neutral-900 bg-transparent px-4 py-2 text-center text-xs font-semibold capitalize text-neutral-900 transition-colors hover:bg-neutral-950 hover:text-white sm:text-sm " +
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
          addVariant(product.defaultVariantId!, product.id, q);
          trackMetaPixel("AddToCart", {
            content_ids: [product.defaultVariantId],
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
