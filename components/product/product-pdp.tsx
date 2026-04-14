"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import ReactStars from "react-rating-stars-component";
import { AnimatePresence, motion } from "framer-motion";
import { AddToCartVariantButton } from "@/components/cart/AddToCartVariantButton";
import { AppSelect } from "@/components/ui/app-select";
import type {
  DbProductAssetRow,
  DbProductRow,
  DbProductVariantRow,
} from "@/app/lib/db/types";
import { formatPkr } from "@/app/lib/format-currency";
import { useCart } from "@/app/providers/cart-provider";

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

type GalleryItem = { kind: "image" | "video"; url: string; alt: string };

function buildGallery(
  assets: DbProductAssetRow[] | undefined,
  fallbackImages: unknown,
): GalleryItem[] {
  if (assets && assets.length > 0) {
    return [...assets]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({
        kind: a.kind,
        url: a.url,
        alt: a.alt_text || "",
      }));
  }
  const img = firstImage(fallbackImages);
  if (img) return [{ kind: "image", url: img, alt: "" }];
  return [];
}

type Props = {
  product: DbProductRow;
  collectionLabel: string;
  variants: DbProductVariantRow[];
  /** When set (e.g. from DB), drives gallery + video; otherwise uses `product.images` */
  assets?: DbProductAssetRow[];
};

export function ProductPdp({ product, collectionLabel, variants, assets }: Props) {
  const { isOpen: cartDrawerOpen } = useCart();

  const keys = useMemo(() => {
    const s = new Set<string>();
    for (const v of variants) {
      for (const k of Object.keys(v.option_values)) {
        s.add(k);
      }
    }
    return [...s].sort();
  }, [variants]);

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    const v0 = variants[0];
    if (v0) {
      for (const k of Object.keys(v0.option_values)) {
        init[k] = v0.option_values[k] ?? "";
      }
    }
    return init;
  });

  const selectedVariant = useMemo(() => {
    return (
      variants.find((v) =>
        keys.every((k) => (v.option_values[k] ?? "") === (selection[k] ?? "")),
      ) ?? variants[0]
    );
  }, [variants, keys, selection]);

  const [quantity, setQuantity] = useState(1);

  const maxQty = selectedVariant
    ? Math.max(
        0,
        (selectedVariant.quantity_on_hand ?? 0) -
          (selectedVariant.quantity_reserved ?? 0),
      )
    : 0;

  function setOption(key: string, value: string) {
    setSelection((prev) => {
      const next = { ...prev, [key]: value };
      const match = variants.find((v) =>
        keys.every((k) => (v.option_values[k] ?? "") === (next[k] ?? "")),
      );
      if (match) return next;
      const relaxed = variants.find((v) => v.option_values[key] === value);
      if (relaxed) {
        return { ...relaxed.option_values };
      }
      return next;
    });
    setQuantity(1);
  }

  const gallery = useMemo(
    () => buildGallery(assets, product.images),
    [assets, product.images],
  );
  const [activeMedia, setActiveMedia] = useState(0);
  const main = gallery[activeMedia] ?? gallery[0];

  const safeDescriptionHtml = useMemo(() => {
    const raw = product.description?.trim();
    if (!raw) return "";
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }, [product.description]);

  const purchaseBlockRef = useRef<HTMLDivElement>(null);
  /** True only after the user scrolls down so the primary CTAs sit above the viewport (not when they are still below the fold on load). */
  const [ctaScrolledPast, setCtaScrolledPast] = useState(false);

  useEffect(() => {
    const el = purchaseBlockRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    function updateCta(entry: IntersectionObserverEntry) {
      const r = entry.boundingClientRect;
      const vh = window.innerHeight;
      if (entry.isIntersecting) {
        setCtaScrolledPast(false);
        return;
      }
      const fullyBelowViewport = r.top >= vh;
      const fullyAboveViewport = r.bottom <= 0;
      setCtaScrolledPast(fullyAboveViewport && !fullyBelowViewport);
    }

    const io = new IntersectionObserver(([entry]) => updateCta(entry), {
      root: null,
      rootMargin: "0px",
      threshold: [0, 0.01, 0.99, 1],
    });
    io.observe(el);
    return () => io.disconnect();
  }, [selectedVariant?.id]);

  const thumbUrl = useMemo(() => {
    if (main?.kind === "image") return main.url;
    const firstImg = gallery.find((g) => g.kind === "image");
    return firstImg?.url ?? "";
  }, [main, gallery]);

  /** Stays visible for the rest of the scroll, including over the footer (fixed to the viewport bottom). */
  const showStickyPurchase = Boolean(selectedVariant) && ctaScrolledPast;
  /** Hide while cart drawer is open (full-screen on mobile) so it does not stack on top of the drawer. */
  const showMobileStickyBar = showStickyPurchase && !cartDrawerOpen;

  const stickyBarRef = useRef<HTMLDivElement | null>(null);

  /** Reserve space at the bottom of the page so footer / copyright can scroll above the fixed bar (mobile & tablet). */
  useLayoutEffect(() => {
    const page = document.getElementById("PageContainer");
    if (!page) return;

    const mq = window.matchMedia("(max-width: 1023px)");

    const syncPadding = () => {
      if (!mq.matches || !showStickyPurchase || cartDrawerOpen) {
        page.style.paddingBottom = "";
        return;
      }
      const el = stickyBarRef.current;
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height);
      page.style.paddingBottom = h > 0 ? `${h}px` : "";
    };

    let ro: ResizeObserver | undefined;
    const attach = () => {
      syncPadding();
      if (typeof ResizeObserver === "undefined") return;
      ro?.disconnect();
      const el = stickyBarRef.current;
      if (!el) return;
      ro = new ResizeObserver(syncPadding);
      ro.observe(el);
    };

    attach();
    const t = window.setTimeout(attach, 0);

    window.addEventListener("resize", syncPadding);
    mq.addEventListener("change", syncPadding);

    return () => {
      clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener("resize", syncPadding);
      mq.removeEventListener("change", syncPadding);
      page.style.paddingBottom = "";
    };
  }, [showStickyPurchase, cartDrawerOpen]);

  const pdpEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="min-h-[420px] overflow-hidden rounded-2xl bg-neutral-100">
            {main?.kind === "video" ? (
              <video
                src={main.url}
                controls
                playsInline
                className="h-full min-h-[420px] w-full object-contain"
              />
            ) : main ? (
              <div
                className="min-h-[420px] w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${main.url})` }}
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-neutral-400">
                No media
              </div>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((item, i) => (
                <button
                  key={`${item.url}-${i}`}
                  type="button"
                  onClick={() => setActiveMedia(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    activeMedia === i ? "border-neutral-950" : "border-transparent"
                  }`}
                >
                  {item.kind === "video" ? (
                    <span className="flex h-full w-full items-center justify-center bg-neutral-200 text-[10px] font-medium text-neutral-700">
                      Video
                    </span>
                  ) : (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.url})` }}
                    />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <p className="text-sm capitalize tracking-wide text-neutral-500">{collectionLabel}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          {safeDescriptionHtml ? (
            <div
              className="text-neutral-600 [&_a]:text-neutral-900 [&_a]:underline [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <ReactStars
              count={5}
              value={Number(product.rating ?? 0)}
              size={22}
              activeColor="#eab308"
              isHalf
              edit={false}
            />
            <span>
              {(product.rating ?? 0).toFixed(1)}/5 ({product.reviews_count ?? 0} reviews)
            </span>
          </div>

          {keys.length > 0 ? (
            <div className="space-y-3">
              {keys.map((key) => {
                const values = [
                  ...new Set(
                    variants.map((v) => v.option_values[key]).filter(Boolean) as string[],
                  ),
                ].sort();
                const variantOptions = values.map((val) => ({
                  value: val,
                  label: val,
                }));
                return (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold capitalize tracking-wide text-neutral-500">
                      {key}
                    </label>
                    <AppSelect
                      inputId={`pdp-option-${key.replace(/\s+/g, "-").toLowerCase()}`}
                      className="max-w-xs"
                      classNamePrefix="pdp-select"
                      options={variantOptions}
                      value={
                        variantOptions.find(
                          (o) => o.value === (selection[key] ?? ""),
                        ) ?? null
                      }
                      onChange={(opt) => {
                        if (opt) setOption(key, opt.value);
                      }}
                      isSearchable={values.length > 10}
                      isClearable={false}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {selectedVariant ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                {selectedVariant.compare_at_price != null &&
                selectedVariant.compare_at_price > selectedVariant.price ? (
                  <>
                    <span className="text-lg text-neutral-500 line-through">
                      {formatPkr(Number(selectedVariant.compare_at_price))}
                    </span>
                    <p className="text-2xl font-semibold">
                      {formatPkr(Number(selectedVariant.price))}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-semibold">
                    {formatPkr(Number(selectedVariant.price))}
                  </p>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {maxQty > 0 ? `${maxQty} in stock` : "Out of stock"}
              </p>

              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <span className="mb-1 block text-xs font-medium capitalize tracking-wide text-neutral-500">
                    Quantity
                  </span>
                  <div
                    className="inline-flex items-stretch rounded-lg border border-neutral-300 bg-white"
                    role="group"
                    aria-label="Quantity"
                  >
                    <button
                      type="button"
                      className="px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-40"
                      aria-label="Decrease quantity"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span
                      className="flex min-w-11 items-center justify-center border-x border-neutral-200 px-2 py-2 text-center text-sm font-medium tabular-nums text-neutral-900"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-40"
                      aria-label="Increase quantity"
                      disabled={quantity >= maxQty}
                      onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div
                  ref={purchaseBlockRef}
                  className="flex flex-wrap items-center gap-3"
                >
                  <AddToCartVariantButton
                    variantId={selectedVariant.id}
                    productId={product.id}
                    quantity={quantity}
                    maxQuantity={maxQty}
                    disabled={maxQty < 1}
                    openDrawer
                    itemName={product.name}
                    className="rounded-full px-6 py-3 text-sm disabled:opacity-50"
                  />
                  <AddToCartVariantButton
                    variantId={selectedVariant.id}
                    productId={product.id}
                    quantity={quantity}
                    maxQuantity={maxQty}
                    disabled={maxQty < 1}
                    openDrawer={false}
                    redirectHref="/checkout"
                    label="Buy now"
                    itemName={product.name}
                    className="rounded-full px-6 py-3 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-600">This product has no purchasable variants.</p>
          )}
        </div>
      </section>

      {/* Mobile / tablet: compact sticky bar — thumbnail left, small actions right; page gets bottom padding so copyright clears the bar */}
      <div className="lg:hidden" aria-hidden={!showMobileStickyBar}>
        <AnimatePresence
          onExitComplete={() => {
            const page = document.getElementById("PageContainer");
            if (page) page.style.paddingBottom = "";
          }}
        >
          {showMobileStickyBar && selectedVariant ? (
            <motion.div
              ref={stickyBarRef}
              key="pdp-sticky-purchase"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.38, ease: pdpEase }}
              className="fixed inset-x-0 bottom-0 z-45 border-t border-neutral-200 bg-white/95 shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md"
              style={{
                paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))",
                paddingTop: "0.375rem",
              }}
            >
              <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-2.5 sm:gap-3 sm:px-4">
                <div
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-none border border-neutral-200 bg-neutral-100 bg-cover bg-center sm:h-16 sm:w-16"
                  style={
                    thumbUrl ? { backgroundImage: `url(${thumbUrl})` } : undefined
                  }
                  aria-hidden
                />
                <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
                  <AddToCartVariantButton
                    variantId={selectedVariant.id}
                    productId={product.id}
                    quantity={quantity}
                    maxQuantity={maxQty}
                    disabled={maxQty < 1}
                    openDrawer
                    itemName={product.name}
                    className="rounded-md! px-2! py-1.5! text-[11px]! font-semibold! leading-tight! shadow-none! hover:shadow-sm! disabled:opacity-50 sm:px-2.5! sm:py-1.5! sm:text-xs!"
                  />
                  <AddToCartVariantButton
                    variantId={selectedVariant.id}
                    productId={product.id}
                    quantity={quantity}
                    maxQuantity={maxQty}
                    disabled={maxQty < 1}
                    openDrawer={false}
                    redirectHref="/checkout"
                    label="Buy now"
                    itemName={product.name}
                    className="rounded-md! px-2! py-1.5! text-[11px]! font-semibold! leading-tight! shadow-none! hover:shadow-sm! disabled:opacity-50 sm:px-2.5! sm:py-1.5! sm:text-xs!"
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
