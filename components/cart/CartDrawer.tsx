"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "@/app/providers/cart-provider";
import { useScrollLock } from "@/lib/scroll-lock";
import { formatPkr } from "@/app/lib/format-currency";
import type { Product } from "@/app/lib/catalog/types";
import { hasCatalogDb } from "@/app/lib/db/env";
import { fetchCheapestVariantForProductSlug } from "@/app/lib/cart/fetch-cheapest-variant-client";
import {
  fetchStoreDeliverySettings,
  type StoreDeliverySettingsState,
} from "@/app/lib/fetch-store-delivery-settings";
import { computeDeliveryPkr } from "@/app/lib/delivery-pricing";
import { FALLBACK_STANDARD_DELIVERY_PAISA } from "@/lib/checkout-constants";
import { CartFreeDeliveryProgress } from "@/components/cart/cart-free-delivery-progress";

const easeSilk: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeSoftIn: [number, number, number, number] = [0.4, 0, 0.2, 1];

function CartLineRemoveIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function DrawerRecoTile({ product }: { product: Product }) {
  const { addVariant, closeCart } = useCart();
  const [quick, setQuick] = useState<
    { variantId: string; productId: string } | null | undefined
  >(undefined);

  useEffect(() => {
    if (!hasCatalogDb()) {
      queueMicrotask(() => setQuick(null));
      return;
    }
    let cancelled = false;
    void fetchCheapestVariantForProductSlug(product.slug).then((r) => {
      if (!cancelled) setQuick(r ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [product.slug]);

  return (
    <div className="col-span-6 flex min-w-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <Link
        href={`/products/${product.slug}`}
        onClick={closeCart}
        className="relative block aspect-square w-full overflow-hidden bg-neutral-100 bg-cover bg-center transition hover:opacity-95"
        style={{ backgroundImage: `url(${product.image})` }}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-neutral-900">
          {product.name}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs leading-none">
          {product.compareAtPrice && product.compareAtPrice > product.price ? (
            <>
              <span className="text-neutral-400 line-through">
                {formatPkr(product.compareAtPrice)}
              </span>
              <span className="font-semibold text-neutral-900">{formatPkr(product.price)}</span>
            </>
          ) : (
            <span className="font-semibold text-neutral-900">{formatPkr(product.price)}</span>
          )}
        </div>
        {quick === undefined ? (
          <div
            className="mt-auto h-8 w-full animate-pulse rounded-md bg-neutral-200"
            aria-hidden
          />
        ) : quick ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            className="btn mt-auto w-full !rounded-none border border-neutral-900 bg-neutral-950 text-white hover:bg-neutral-800"
            onClick={() => addVariant(quick.variantId, quick.productId, 1)}
          >
            Add to cart
          </motion.button>
        ) : (
          <Link
            href={`/products/${product.slug}`}
            onClick={closeCart}
            className="btn mt-auto flex w-full items-center justify-center !rounded-none border border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-50"
          >
            Choose options
          </Link>
        )}
      </div>
    </div>
  );
}

/** Shown while `lines` exist but Supabase has not returned variant + product rows yet. */
function CartLineResolvingSkeleton() {
  return (
    <div
      className="flex gap-4 animate-pulse"
      aria-busy="true"
      aria-label="Loading cart line"
    >
      <div className="size-24 shrink-0 rounded-md bg-neutral-100" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <div className="h-4 max-w-56 rounded bg-neutral-100" />
        <div className="h-3 max-w-24 rounded bg-neutral-100" />
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="h-8 w-26 rounded border border-neutral-200 bg-neutral-50" />
          <div className="h-4 w-14 rounded bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

/** Same shell as `DrawerRecoTile` while random products are fetched. */
function DrawerRecoTileSkeleton() {
  return (
    <div className="col-span-6 flex min-w-0 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="aspect-square w-full animate-pulse bg-neutral-100" aria-hidden />
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
        <div className="space-y-1.5">
          <div className="h-2.5 w-full animate-pulse rounded bg-neutral-200" />
          <div className="h-2.5 w-[85%] animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="h-3 w-14 animate-pulse rounded bg-neutral-100" />
        <div
          className="mt-auto h-8 w-full animate-pulse rounded-md bg-neutral-200"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const router = useRouter();
  const {
    isOpen,
    closeCart,
    lines,
    resolvedLines,
    subtotal,
    updateQuantity,
    removeItem,
    waitForCartResolution,
  } = useCart();
  const [checkoutNavigating, setCheckoutNavigating] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState<StoreDeliverySettingsState | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  /** Ignore the opening click so the backdrop does not instantly close the drawer. */
  const [backdropArmed, setBackdropArmed] = useState(false);
  const openGenRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setBackdropArmed(false);
      return;
    }
    const gen = ++openGenRef.current;
    setBackdropArmed(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (openGenRef.current === gen) setBackdropArmed(true);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const merchandiseShippingBasisPkr = useMemo(
    () =>
      resolvedLines.reduce(
        (sum, { line, unitPrice, product }) =>
          product.freeDelivery ? sum : sum + unitPrice * line.quantity,
        0,
      ),
    [resolvedLines],
  );

  const deliveryPkr = useMemo(() => {
    if (resolvedLines.length === 0) return null;
    return computeDeliveryPkr(merchandiseShippingBasisPkr, {
      standard_delivery_paisa:
        deliverySettings?.standardPaisa ?? FALLBACK_STANDARD_DELIVERY_PAISA,
      free_delivery_thresholds_paisa: deliverySettings?.freeThresholdsPaisa ?? [],
    });
  }, [resolvedLines.length, merchandiseShippingBasisPkr, deliverySettings]);

  const estimatedTotalPkr = useMemo(() => {
    if (deliveryPkr == null) return null;
    return Math.max(0, subtotal + deliveryPkr);
  }, [subtotal, deliveryPkr]);

  /** “You might also like” only when the cart is empty (Shopify-style). */
  const showEmptyCartRecommendations = lines.length === 0;

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    if (!hasCatalogDb()) {
      queueMicrotask(() => {
        setDeliverySettings(null);
        setDeliveryLoading(false);
      });
      return;
    }
    let cancelled = false;
    /** Keep previous settings while refetching so the free-shipping bar does not reset / animate from empty each open. */
    queueMicrotask(() => setDeliveryLoading(true));
    void fetchStoreDeliverySettings().then((s) => {
      if (cancelled) return;
      setDeliverySettings(s);
      setDeliveryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => setRecoLoading(false));
      return;
    }
    if (!showEmptyCartRecommendations) {
      queueMicrotask(() => {
        setRecommended([]);
        setRecoLoading(false);
      });
      return;
    }
    if (!hasCatalogDb()) {
      queueMicrotask(() => {
        setRecommended([]);
        setRecoLoading(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      setRecoLoading(true);
      setRecommended([]);
    });
    void fetch("/api/catalog/random-products?limit=2")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Product[]) => {
        if (!cancelled && Array.isArray(data)) {
          setRecommended(data);
        }
      })
      .catch(() => {
        if (!cancelled) setRecommended([]);
      })
      .finally(() => {
        if (!cancelled) setRecoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, showEmptyCartRecommendations]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-180"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0.12 } : { duration: 0.45, ease: easeSilk }
          }
        >
          <motion.button
            type="button"
            aria-label="Close cart"
            onClick={backdropArmed ? closeCart : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0.12 } : { duration: 0.5, ease: easeSilk }
            }
            className={`absolute inset-0 bg-black/25 backdrop-blur-[2px] ${backdropArmed ? "" : "pointer-events-none"}`}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 z-181 flex min-h-0 w-full max-w-md flex-col bg-white px-5 pt-5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),-24px_0_48px_-12px_rgba(0,0,0,0.18)] sm:max-w-lg sm:px-6"
            style={{
              willChange: "transform",
              maxHeight: "100dvh",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
            }}
            initial={{ x: "100%", opacity: 0.98 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{
              x: "100%",
              opacity: 1,
              transition: prefersReducedMotion
                ? { duration: 0.12 }
                : {
                    x: {
                      type: "tween",
                      duration: 0.42,
                      ease: easeSoftIn,
                    },
                    opacity: {
                      duration: 0.25,
                      ease: easeSoftIn,
                    },
                  },
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0.18 }
                : {
                    x: {
                      type: "spring",
                      stiffness: 200,
                      damping: 36,
                      mass: 0.95,
                      restDelta: 0.5,
                      restSpeed: 0.5,
                    },
                    opacity: { duration: 0.4, ease: easeSilk },
                  }
            }
          >
            <motion.div
              className="flex items-center justify-between border-b border-neutral-200 pb-5"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.1 }
                  : { delay: 0.06, duration: 0.35, ease: easeSilk }
              }
            >
              <h2 className="text-[1.50rem] font-semibold tracking-tight sm:text-3xl">Cart</h2>
              <motion.button
                type="button"
                onClick={closeCart}
                whileHover={prefersReducedMotion ? {} : { scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-neutral-500 hover:bg-neutral-100"
              >
                ×
              </motion.button>
            </motion.div>

            {lines.length > 0 ? (
              <CartFreeDeliveryProgress
                subtotalPkr={merchandiseShippingBasisPkr}
                settings={deliverySettings}
                loading={deliveryLoading}
                shippingBasisKnown={resolvedLines.length > 0}
              />
            ) : null}

            <motion.div
              className="flex min-h-0 flex-1 flex-col overflow-hidden py-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: prefersReducedMotion ? 0 : 0.06,
                    delayChildren: prefersReducedMotion ? 0 : 0.1,
                  },
                },
              }}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain overscroll-y-contain">
                  {lines.length === 0 ? (
                    <motion.p
                      className="text-sm text-neutral-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Your cart is empty.{" "}
                      <Link
                        href="/collections"
                        className="font-medium text-neutral-900 underline"
                        onClick={closeCart}
                      >
                        Continue shopping
                      </Link>
                    </motion.p>
                  ) : resolvedLines.length === 0 ? (
                    <div className="space-y-5">
                      {lines.map((l) => (
                        <CartLineResolvingSkeleton key={l.variantId} />
                      ))}
                    </div>
                  ) : (
                    resolvedLines.map(({ line, product, unitPrice, variantLabel }) => (
                      <motion.article
                        key={line.variantId}
                        className="flex gap-4"
                        variants={{
                          hidden: { opacity: 0, y: 14, scale: 0.98 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                              duration: prefersReducedMotion ? 0.1 : 0.4,
                              ease: easeSilk,
                            },
                          },
                        }}
                      >
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={closeCart}
                          className="size-24 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 bg-cover bg-center sm:size-28"
                          style={{ backgroundImage: `url(${product.image})` }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex w-full min-w-0 items-center justify-between gap-2">
                            <Link
                              href={`/products/${product.slug}`}
                              onClick={closeCart}
                              className="min-w-0 flex-1 wrap-break-word text-sm font-medium leading-5 text-neutral-900 hover:underline"
                            >
                              {product.name}
                            </Link>
                            <button
                              type="button"
                              className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                              aria-label={`Remove ${product.name}`}
                              onClick={() => removeItem(line.variantId)}
                            >
                              <CartLineRemoveIcon className="h-4 w-4" />
                            </button>
                          </div>
                          {variantLabel ? (
                            <p className="mt-0.5 text-xs text-neutral-500">{variantLabel}</p>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="inline-flex items-center overflow-hidden rounded border border-neutral-300">
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.92 }}
                                className="px-2 py-1 text-sm transition-colors hover:bg-neutral-50"
                                aria-label="Decrease quantity"
                                onClick={() =>
                                  updateQuantity(line.variantId, line.quantity - 1)
                                }
                              >
                                −
                              </motion.button>
                              <span className="border-x border-neutral-300 px-2 py-1 text-sm tabular-nums">
                                {line.quantity}
                              </span>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.92 }}
                                className="px-2 py-1 text-sm transition-colors hover:bg-neutral-50"
                                aria-label="Increase quantity"
                                onClick={() =>
                                  updateQuantity(line.variantId, line.quantity + 1)
                                }
                              >
                                +
                              </motion.button>
                            </div>
                            <p className="shrink-0 text-sm font-medium tabular-nums">
                              {formatPkr(unitPrice * line.quantity)}
                            </p>
                          </div>
                        </div>
                      </motion.article>
                    ))
                  )}
                </div>

                {showEmptyCartRecommendations && (recoLoading || recommended.length > 0) ? (
                  <div
                    className="mt-4 shrink-0 border-t border-neutral-200 pt-5"
                    aria-busy={recoLoading}
                  >
                    <h3 className="text-xs font-semibold capitalize tracking-[0.14em] text-neutral-500">
                      You might like
                    </h3>
                    <div className="mt-3 grid grid-cols-12 gap-3">
                      {recoLoading
                        ? [0, 1].map((i) => <DrawerRecoTileSkeleton key={i} />)
                        : recommended.map((p) => (
                            <DrawerRecoTile key={p.id} product={p} />
                          ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>

            {lines.length > 0 ? (
              <motion.div
                className="mt-auto shrink-0 border-t border-neutral-200 bg-white pt-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.1 }
                    : { delay: 0.14, duration: 0.4, ease: easeSilk }
                }
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-neutral-600">
                    <span>Subtotal</span>
                    <span className="tabular-nums text-neutral-900">
                      {resolvedLines.length > 0 ? formatPkr(subtotal) : "…"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-neutral-600">
                    <span>Shipping</span>
                    <span className="tabular-nums text-neutral-900">
                      {deliveryPkr == null
                        ? "…"
                        : deliveryPkr <= 0
                          ? "Free"
                          : formatPkr(deliveryPkr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-xs font-semibold capitalize tracking-[0.2em] text-neutral-900">
                    <span>Total</span>
                    <span className="tabular-nums text-neutral-900 normal-case tracking-normal text-base">
                      {estimatedTotalPkr != null ? formatPkr(estimatedTotalPkr) : "…"}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  Taxes and discount codes calculated at checkout.
                </p>
                {resolvedLines.length > 0 ? (
                  <button
                    type="button"
                    disabled={checkoutNavigating}
                    onClick={() => {
                      void (async () => {
                        setCheckoutNavigating(true);
                        try {
                          await waitForCartResolution();
                          closeCart();
                          router.push("/checkout");
                        } finally {
                          setCheckoutNavigating(false);
                        }
                      })();
                    }}
                    className="btn mt-5 flex w-full items-center justify-center rounded-none bg-black text-white shadow-lg shadow-black/20 transition-[transform,box-shadow] hover:scale-[1.015] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutNavigating ? "Loading…" : "Check out"}
                  </button>
                ) : null}
              </motion.div>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
