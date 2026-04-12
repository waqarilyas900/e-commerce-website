"use client";

import { useState } from "react";
import { useCart } from "@/app/providers/cart-provider";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { toastAddedToCart } from "@/lib/cart-toast";
import { ADD_TO_CART_BUTTON_MS, delayMs } from "@/lib/cart-add-feedback";

type Props = {
  variantId: string;
  productId: string;
  className?: string;
  label?: string;
  openDrawer?: boolean;
  quantity?: number;
  disabled?: boolean;
  maxQuantity?: number;
  /** Shown in the toast (e.g. product title). */
  itemName?: string;
};

export function AddToCartVariantButton({
  variantId,
  productId,
  className = "rounded-full px-6 py-3 text-sm",
  label = "Add to cart",
  openDrawer = true,
  quantity = 1,
  disabled = false,
  maxQuantity = 99,
  itemName,
}: Props) {
  const { addVariant, openCart } = useCart();
  const [adding, setAdding] = useState(false);
  const q = Math.min(maxQuantity, Math.max(1, Math.floor(quantity)));

  return (
    <PrimaryActionButton
      disabled={disabled}
      loading={adding}
      className={className}
      onClick={async () => {
        if (disabled || adding) return;
        setAdding(true);
        try {
          await delayMs(ADD_TO_CART_BUTTON_MS);
          addVariant(variantId, productId, q);
          toastAddedToCart({
            description:
              itemName != null
                ? q > 1
                  ? `${itemName} · ${q} added`
                  : itemName
                : undefined,
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
