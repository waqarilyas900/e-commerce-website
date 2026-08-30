"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useProductPreview } from "@/app/providers/product-preview-provider";
import { useCart } from "@/app/providers/cart-provider";
import { useScrollLock } from "@/lib/scroll-lock";
import { formatPkr } from "@/app/lib/format-currency";
import { StarRating } from "@/components/ui/star-rating";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";
import {
  defaultMetaCurrency,
  metaContentsSingleItem,
  resolveVariantTrackingId,
  toPkrValue,
  trackMetaPixel,
} from "@/lib/seo/meta-pixel-client";
import { toastAddedToCart } from "@/lib/cart-toast";
import { ADD_TO_CART_BUTTON_MS, delayMs } from "@/lib/cart-add-feedback";

const easeSilk: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeSoftIn: [number, number, number, number] = [0.4, 0, 0.2, 1];

function productImageUseNativeImg(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return false;
  }
  try {
    const host = new URL(src).hostname.toLowerCase();
    if (host.endsWith(".supabase.co")) return false;
    if (host === "images.unsplash.com") return false;
    return true;
  } catch {
    return false;
  }
}

/** AliExpress-style bottom sheet product preview (docked to bottom). */
export function ProductPreviewSheet() {
  const { product, isOpen, closePreview } = useProductPreview();
  const { addVariant, openCart } = useCart();
  const prefersReducedMotion = useReducedMotion();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [backdropArmed, setBackdropArmed] = useState(false);
  const openGenRef = useRef(0);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setBackdropArmed(false);
      return;
    }
    setQty(1);
    setAdding(false);
    const gen = ++openGenRef.current;
    setBackdropArmed(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (openGenRef.current === gen) setBackdropArmed(true);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closePreview]);

  const soldOut = product?.inStock === false;
  const native = product?.image ? productImageUseNativeImg(product.image) : false;
  const imgSrc = product?.image
    ? native
      ? optimizeSupplierImageUrl(product.image, 720)
      : product.image
    : "";

  return (
    <AnimatePresence>
      {isOpen && product ? (
        <motion.div
          className="fixed inset-0 z-[190]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0.12 } : { duration: 0.35, ease: easeSilk }
          }
        >
          <motion.button
            type="button"
            aria-label="Close preview"
            onClick={backdropArmed ? closePreview : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] ${backdropArmed ? "" : "pointer-events-none"}`}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-preview-title"
            className="absolute inset-x-0 bottom-0 z-[191] flex max-h-[min(92dvh,820px)] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)]"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
              willChange: "transform",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{
              y: "100%",
              transition: prefersReducedMotion
                ? { duration: 0.12 }
                : { type: "tween", duration: 0.35, ease: easeSoftIn },
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0.18 }
                : {
                    type: "spring",
                    stiffness: 280,
                    damping: 34,
                    mass: 0.9,
                  }
            }
          >
            {/* Drag handle */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-neutral-300" />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Quick preview
              </p>
              <button
                type="button"
                onClick={closePreview}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
              <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-6">
                <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-xl bg-neutral-100 sm:mx-0 sm:max-w-none">
                  {imgSrc ? (
                    native ? (
                      // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                        width={480}
                        height={480}
                      />
                    ) : (
                      <Image
                        src={imgSrc}
                        alt={product.name}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 640px) 80vw, 240px"
                      />
                    )
                  ) : null}
                  {soldOut ? (
                    <span className="absolute left-2 top-2 rounded bg-black px-2 py-1 text-[11px] font-semibold uppercase text-white">
                      Sold out
                    </span>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-col gap-3">
                  <div>
                    <h2
                      id="product-preview-title"
                      className="text-lg font-semibold leading-snug tracking-tight text-[#1c1d1d] sm:text-xl"
                    >
                      {product.name}
                    </h2>
                    {product.reviews > 0 || product.rating > 0 ? (
                      <div className="mt-1.5">
                        <StarRating value={product.rating} size={16} labeled />
                      </div>
                    ) : null}
                  </div>

                  {product.compareAtPrice != null &&
                  product.compareAtPrice > product.price ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-2xl font-bold text-[#1c1d1d]">
                        {formatPkr(product.price)}
                      </span>
                      <span className="text-sm text-neutral-400 line-through">
                        {formatPkr(product.compareAtPrice)}
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        Save {formatPkr(product.compareAtPrice - product.price)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-[#1c1d1d]">
                      {formatPkr(product.price)}
                    </p>
                  )}

                  {product.shortDescription ? (
                    <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
                      {product.shortDescription}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Qty
                    </span>
                    <div className="inline-flex items-center overflow-hidden rounded-full border border-neutral-200">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="flex h-9 w-9 items-center justify-center text-lg text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
                        disabled={qty <= 1}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="flex h-9 w-9 items-center justify-center text-lg text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
                        disabled={qty >= 99}
                        onClick={() => setQty((q) => Math.min(99, q + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    {product.defaultVariantId && !soldOut ? (
                      <PrimaryActionButton
                        className="w-full flex-1 sm:w-auto"
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
                            addVariant(variantId, product.id, qty);
                            trackMetaPixel("AddToCart", {
                              content_ids: [trackingId],
                              contents: metaContentsSingleItem({
                                id: trackingId,
                                quantity: qty,
                                item_price: product.price,
                              }),
                              content_type: "product",
                              content_name: product.name,
                              currency: defaultMetaCurrency(),
                              value: toPkrValue(product.price * qty),
                              num_items: qty,
                            });
                            toastAddedToCart({
                              description:
                                qty > 1
                                  ? `${product.name} · ${qty} added`
                                  : product.name,
                              quantity: qty,
                            });
                            closePreview();
                            openCart();
                          } finally {
                            setAdding(false);
                          }
                        }}
                      >
                        Add to cart
                      </PrimaryActionButton>
                    ) : (
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={closePreview}
                        className="btn flex w-full flex-1 items-center justify-center !rounded-none border border-neutral-900 bg-transparent text-center text-neutral-900 transition-colors hover:bg-neutral-950 hover:text-white sm:w-auto"
                      >
                        {soldOut ? "View details" : "Choose options"}
                      </Link>
                    )}
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={closePreview}
                      className="btn flex w-full flex-1 items-center justify-center !rounded-none border border-transparent bg-[#E0703A] text-center text-white transition hover:bg-[#c85f2f] sm:w-auto"
                    >
                      View full details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
