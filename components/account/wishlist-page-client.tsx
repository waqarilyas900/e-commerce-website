"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatPkr } from "@/app/lib/format-currency";
import type { WishlistPageItem } from "@/app/lib/wishlist-page";
import { useCart } from "@/app/providers/cart-provider";
import { toastWishlistRemoved } from "@/lib/wishlist-toast";
import { toast } from "sonner";

type Props = {
  initialItems: WishlistPageItem[];
};

export function WishlistPageClient({ initialItems }: Props) {
  const router = useRouter();
  const { addVariant, openCart } = useCart();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function removeItem(item: WishlistPageItem) {
    setBusyId(item.id);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          inWishlist: false,
          wishlistItemId: item.id,
          productVariantId: item.variantId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Could not remove item.");
        return;
      }
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      toastWishlistRemoved();
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not remove item. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  function addToCart(item: WishlistPageItem) {
    if (!item.variantId || item.sellableQty < 1) return;
    addVariant(item.variantId, item.productId, 1, {
      unitPrice: item.unitPrice ?? 0,
      product: {
        id: item.productId,
        slug: item.productSlug,
        name: item.productName,
        image: item.productImage,
        freeDelivery: item.freeDelivery,
      },
      variantLabel: item.variantLabel,
    });
    openCart();
    toast.success("Added to cart", {
      description: item.productName,
      duration: 2800,
    });
  }

  if (items.length === 0) {
    return (
      <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50 to-white shadow-sm ring-1 ring-neutral-950/[0.04]">
        <div className="px-6 py-16 text-center sm:px-10 sm:py-20">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/80">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-neutral-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="mt-5 text-base font-semibold text-neutral-900">Your wishlist is empty</p>
          <p className="mt-2 text-sm text-neutral-600">
            Tap the heart on a product to save it here for later.
          </p>
          <Link
            href="/collections"
            className="mt-8 inline-flex rounded-full bg-neutral-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-neutral-950/[0.04]">
      {items.map((item) => {
        const inStock = Boolean(item.variantId) && item.sellableQty > 0;
        const busy = busyId === item.id;
        return (
          <li
            key={item.id}
            className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
          >
            <Link
              href={`/products/${item.productSlug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200/80 sm:h-28 sm:w-28"
            >
              {item.productImage ? (
                <Image
                  src={item.productImage}
                  alt={item.productName}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  No image
                </span>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.productSlug}`}
                className="text-sm font-semibold text-neutral-900 hover:underline sm:text-base"
              >
                {item.productName}
              </Link>
              {item.optionSummary ? (
                <p className="mt-1 text-xs text-neutral-600 sm:text-sm">{item.optionSummary}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {item.unitPrice != null ? (
                  <span className="font-semibold tabular-nums text-neutral-900">
                    {formatPkr(item.unitPrice)}
                  </span>
                ) : (
                  <span className="text-neutral-500">See product for price</span>
                )}
                {item.isOptionRequest ? (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
                    Option request
                  </span>
                ) : inStock ? (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                    In stock
                  </span>
                ) : (
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200/80">
                    Out of stock
                    {item.notifyOnRestock ? " · restock alert on" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:flex-col sm:items-stretch">
              {inStock ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addToCart(item)}
                  className="inline-flex items-center justify-center rounded-none bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  Add to cart
                </button>
              ) : (
                <Link
                  href={`/products/${item.productSlug}`}
                  className="inline-flex items-center justify-center rounded-none border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  View product
                </Link>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeItem(item)}
                className="inline-flex items-center justify-center rounded-none border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 disabled:opacity-60"
              >
                {busy ? "Removing…" : "Remove"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
