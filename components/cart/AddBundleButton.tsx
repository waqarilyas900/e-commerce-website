"use client";

import { useState } from "react";
import { useCart } from "@/app/providers/cart-provider";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { toastBundleAddedToCart } from "@/lib/cart-toast";
import { ADD_TO_CART_BUTTON_MS, delayMs } from "@/lib/cart-add-feedback";

type Props = {
  lines: { variantId: string; productId: string }[];
  className?: string;
  label?: string;
};

export function AddBundleButton({
  lines,
  className = "",
  label = "Add bundle",
}: Props) {
  const { addVariant, openCart } = useCart();
  const [adding, setAdding] = useState(false);

  const disabled = lines.length === 0;

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
          for (const line of lines) {
            addVariant(line.variantId, line.productId, 1);
          }
          toastBundleAddedToCart({ lineCount: lines.length });
          openCart();
        } finally {
          setAdding(false);
        }
      }}
    >
      {label}
    </PrimaryActionButton>
  );
}
