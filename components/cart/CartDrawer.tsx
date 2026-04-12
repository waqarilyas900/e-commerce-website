"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "@/app/providers/cart-provider";
import { formatPkr } from "@/app/lib/format-currency";
import { products, type Product } from "@/app/lib/store-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { fetchCheapestVariantForProductSlug } from "@/app/lib/cart/fetch-cheapest-variant-client";

const easeSilk: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeSoftIn: [number, number, number, number] = [0.4, 0, 0.2, 1];

function pickRandomProducts(source: Product[], count: number): Product[] {
  if (source.length === 0) return [];
  const copy = [...source];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}

function DrawerRecoTile({ product }: { product: Product }) {
  const { addVariant, closeCart } = useCart();
  const [quick, setQuick] = useState<
    { variantId: string; productId: string } | null | undefined
  >(undefined);

  useEffect(() => {
    if (!hasCatalogDb()) {
      setQuick(null);
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
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-neutral-900">
          {product.name}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-[10px] leading-none">
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
            className="mt-auto w-full rounded-md border border-neutral-900 bg-neutral-950 py-1.5 text-[10px] font-semibold text-white hover:bg-neutral-800"
            onClick={() => addVariant(quick.variantId, quick.productId, 1)}
          >
            Add to cart
          </motion.button>
        ) : (
          <Link
            href={`/products/${product.slug}`}
            onClick={closeCart}
            className="mt-auto flex w-full items-center justify-center rounded-md border border-neutral-300 py-1.5 text-center text-[10px] font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Choose options
          </Link>
        )}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const {
    isOpen,
    closeCart,
    lines,
    resolvedLines,
    subtotal,
    updateQuantity,
    removeItem,
  } = useCart();
  const prefersReducedMotion = useReducedMotion();
  const [recommended, setRecommended] = useState<Product[]>([]);

  /** Only when the cart has zero line items — any product added hides this block. */
  const showRecommendations = lines.length === 0;

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !showRecommendations) return;
    setRecommended(pickRandomProducts(products, 2));
  }, [isOpen, showRecommendations]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-40"
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
            onClick={closeCart}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0.12 } : { duration: 0.5, ease: easeSilk }
            }
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />
          <motion.aside
            className="absolute right-0 top-0 z-50 flex h-screen w-full max-w-lg flex-col overflow-hidden bg-white px-6 py-5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),-24px_0_48px_-12px_rgba(0,0,0,0.18)] sm:max-w-xl"
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
            style={{ willChange: "transform" }}
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
              <h2 className="text-3xl font-semibold tracking-tight">Cart</h2>
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
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
                  {resolvedLines.length === 0 ? (
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
                          className="h-20 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${product.image})` }}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/products/${product.slug}`}
                            onClick={closeCart}
                            className="text-sm font-medium leading-5 text-neutral-900 hover:underline"
                          >
                            {product.name}
                          </Link>
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
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
                            onClick={() => removeItem(line.variantId)}
                          >
                            Remove
                          </button>
                        </div>
                      </motion.article>
                    ))
                  )}
                </div>

                {showRecommendations && recommended.length > 0 ? (
                  <div className="mt-4 shrink-0 border-t border-neutral-200 pt-5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      You might like
                    </h3>
                    <div className="mt-3 grid grid-cols-12 gap-3">
                      {recommended.map((p) => (
                        <DrawerRecoTile key={p.id} product={p} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>

            {lines.length > 0 ? (
              <motion.div
                className="mt-auto border-t border-neutral-200 pt-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.1 }
                    : { delay: 0.14, duration: 0.4, ease: easeSilk }
                }
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-neutral-900">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPkr(subtotal)}</span>
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  Shipping, taxes, and discount codes calculated at checkout.
                </p>
                {resolvedLines.length > 0 ? (
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="mt-5 flex w-full items-center justify-center rounded-md bg-black px-5 py-3 text-base font-semibold text-white shadow-lg shadow-black/20 transition-[transform,box-shadow] hover:scale-[1.015] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.35)] active:scale-[0.985]"
                  >
                    Check out
                  </Link>
                ) : null}
              </motion.div>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
