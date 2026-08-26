"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/providers/cart-provider";
import {
  defaultMetaCurrency,
  metaContentsSingleItem,
  toPkrValue,
  trackMetaPixel,
} from "@/lib/seo/meta-pixel-client";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { toastAddedToCart } from "@/lib/cart-toast";
import { ADD_TO_CART_BUTTON_MS, delayMs } from "@/lib/cart-add-feedback";

type Props = {
  variantId: string;
  productId: string;
  className?: string;
  label?: ReactNode;
  /** Accessible name when `label` is abbreviated/short for small screens. */
  ariaLabel?: string;
  /** When `redirectHref` is set, ignored (drawer is not opened). */
  openDrawer?: boolean;
  quantity?: number;
  disabled?: boolean;
  maxQuantity?: number;
  /** Shown in the toast (e.g. product title). */
  itemName?: string;
  /** After adding to cart, navigate here (e.g. `/checkout`) instead of opening the cart drawer. */
  redirectHref?: string;
  /** Optional unit price for Meta AddToCart value. */
  unitPricePkr?: number;
  /** Optional content identifier override (falls back to `variantId`). */
  contentId?: string;
};

export function AddToCartVariantButton({
  variantId,
  productId,
  className = "",
  label = "Add to cart",
  ariaLabel,
  openDrawer = true,
  quantity = 1,
  disabled = false,
  maxQuantity = 99,
  itemName,
  redirectHref,
  unitPricePkr,
  contentId,
}: Props) {
  const router = useRouter();
  const { addVariant, openCart, waitForCartResolution } = useCart();
  const [adding, setAdding] = useState(false);
  const q = Math.min(maxQuantity, Math.max(1, Math.floor(quantity)));

  return (
    <PrimaryActionButton
      disabled={disabled}
      loading={adding}
      className={className}
      aria-label={
        ariaLabel ?? (typeof label === "string" ? label : undefined)
      }
      onClick={async () => {
        if (disabled || adding) return;
        setAdding(true);
        try {
          await delayMs(ADD_TO_CART_BUTTON_MS);
          addVariant(variantId, productId, q);
          const cid = contentId || variantId;
          const trackedValue = toPkrValue((unitPricePkr ?? 0) * q);
          trackMetaPixel("AddToCart", {
            content_ids: [cid],
            contents: metaContentsSingleItem({
              id: cid,
              quantity: q,
              ...(unitPricePkr != null && Number.isFinite(unitPricePkr) ? { item_price: unitPricePkr } : {}),
            }),
            content_type: "product",
            ...(itemName ? { content_name: itemName } : {}),
            currency: defaultMetaCurrency(),
            value: trackedValue,
            num_items: q,
          });
          toastAddedToCart({
            description:
              itemName != null
                ? q > 1
                  ? `${itemName} · ${q} added`
                  : itemName
                : undefined,
            quantity: q,
          });
          if (redirectHref) {
            await waitForCartResolution();
            router.push(redirectHref);
          } else if (openDrawer) {
            openCart();
          }
        } finally {
          setAdding(false);
        }
      }}
    >
      {label}
    </PrimaryActionButton>
  );
}
