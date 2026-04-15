"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DOMPurify from "isomorphic-dompurify";
import ReactStars from "react-rating-stars-component";
import { AnimatePresence, motion } from "framer-motion";
import { AddToCartVariantButton } from "@/components/cart/AddToCartVariantButton";
import {
  PdpWishlistActions,
  type PdpWishlistBulkChange,
} from "@/components/product/pdp-wishlist-actions";
import { createClient } from "@/lib/supabase/client";
import { clientOptionFingerprint } from "@/lib/wishlist-fingerprint";
import { AppSelect } from "@/components/ui/app-select";
import {
  collectOptionKeysFromVariants,
  resolveDimensionsForPdp,
  type VariantOptionSchemaEntry,
} from "@/app/lib/catalog/variant-option-schema";
import type { ProductDetailColorMeta } from "@/app/lib/db/catalog";
import type {
  DbProductAssetRow,
  DbProductRow,
  DbProductVariantRow,
} from "@/app/lib/db/types";
import { formatPkr } from "@/app/lib/format-currency";
import { useCart } from "@/app/providers/cart-provider";

function sellableQty(v: DbProductVariantRow): number {
  return Math.max(
    0,
    (v.quantity_on_hand ?? 0) - (v.quantity_reserved ?? 0),
  );
}

function findVariantExact(
  variants: DbProductVariantRow[],
  keys: string[],
  selection: Record<string, string>,
): DbProductVariantRow | undefined {
  return variants.find((v) =>
    keys.every((k) => (v.option_values[k] ?? "") === (selection[k] ?? "")),
  );
}

function initialSelectionForVariants(
  variants: DbProductVariantRow[],
  keys: string[],
): Record<string, string> {
  const first = variants.find((v) => sellableQty(v) > 0) ?? variants[0];
  const sel: Record<string, string> = {};
  for (const k of keys) {
    sel[k] = first ? (first.option_values[k] ?? "") : "";
  }
  return sel;
}

function hexForColorValue(
  variants: DbProductVariantRow[],
  optionKey: string,
  value: string,
  colorById: Record<string, ProductDetailColorMeta>,
): string | null {
  const row = variants.find(
    (x) =>
      (x.option_values[optionKey] ?? "") === value && Boolean(x.color_id),
  );
  if (!row?.color_id) return null;
  return colorById[row.color_id]?.hex ?? null;
}

function firstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "";
}

/** Dedupe concurrent identical bulk wishlist GETs (e.g. React Strict Mode double mount). Key must include auth epoch so sign-in/out never reuse another session’s response. */
const bulkWishlistInflight = new Map<string, Promise<Response>>();

function fetchWishlistBulkOnce(dedupeKey: string, url: string): Promise<Response> {
  const existing = bulkWishlistInflight.get(dedupeKey);
  /** Each caller gets a fresh clone() so two Strict Mode effect runs can both read JSON. */
  if (existing) return existing.then((r) => r.clone());
  const p = fetch(url, { credentials: "same-origin" });
  bulkWishlistInflight.set(dedupeKey, p);
  p.finally(() => {
    globalThis.setTimeout(() => bulkWishlistInflight.delete(dedupeKey), 2500);
  });
  return p.then((r) => r.clone());
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
  /** PDP URL segment for login redirect + wishlist */
  productSlug: string;
  /** From `product_option_definitions`; labels and picker style per dimension. */
  optionDefinitions: VariantOptionSchemaEntry[];
  collectionLabel: string;
  variants: DbProductVariantRow[];
  /** When set (e.g. from DB), drives gallery + video; otherwise uses `product.images` */
  assets?: DbProductAssetRow[];
  /** For color swatches; keyed by `colors.id` from variants. */
  colorById?: Record<string, ProductDetailColorMeta>;
};

export function ProductPdp({
  product,
  productSlug,
  optionDefinitions,
  collectionLabel,
  variants,
  assets,
  colorById = {},
}: Props) {
  const { isOpen: cartDrawerOpen } = useCart();

  const variantKeys = useMemo(
    () => collectOptionKeysFromVariants(variants.map((v) => v.option_values ?? {})),
    [variants],
  );

  const dimensions = useMemo(
    () => resolveDimensionsForPdp(variantKeys, optionDefinitions),
    [variantKeys, optionDefinitions],
  );

  const keys = useMemo(() => dimensions.map((d) => d.key), [dimensions]);

  const variantIds = useMemo(() => variants.map((v) => v.id), [variants]);
  /** Stable primitive for effect deps (avoids ref churn when `variantIds` array identity changes). */
  const variantIdsKey = useMemo(() => variantIds.join(","), [variantIds]);

  const [selection, setSelection] = useState<Record<string, string>>(() =>
    initialSelectionForVariants(variants, keys),
  );

  const [authTick, setAuthTick] = useState(0);
  /** Baseline + last seen auth user id — avoids extra bulk refetch when Supabase emits duplicate SIGNED_IN for the same session. */
  const lastAuthUserIdRef = useRef<string | null | undefined>(undefined);
  const [wishlistVariantIds, setWishlistVariantIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [wishlistOptionFingerprints, setWishlistOptionFingerprints] = useState<
    Set<string>
  >(() => new Set());
  const [wishlistReady, setWishlistReady] = useState(false);
  const [currentOptionFingerprint, setCurrentOptionFingerprint] = useState("");

  const handleWishlistBulkChange = useCallback((patch: PdpWishlistBulkChange) => {
    if (patch.variantId) {
      setWishlistVariantIds((prev) => {
        const n = new Set(prev);
        if (patch.inWishlist) n.add(patch.variantId!);
        else n.delete(patch.variantId!);
        return n;
      });
    }
    if (patch.optionFingerprint) {
      setWishlistOptionFingerprints((prev) => {
        const n = new Set(prev);
        if (patch.inWishlist) n.add(patch.optionFingerprint!);
        else n.delete(patch.optionFingerprint!);
        return n;
      });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user?.id ?? null;
      if (lastAuthUserIdRef.current === undefined) {
        lastAuthUserIdRef.current = nextId;
      } else if (lastAuthUserIdRef.current !== nextId) {
        lastAuthUserIdRef.current = nextId;
        setAuthTick((t) => t + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setWishlistReady(false);
    setWishlistVariantIds(new Set());
    setWishlistOptionFingerprints(new Set());

    (async () => {
      const params = new URLSearchParams();
      params.set("productId", product.id);
      params.set("bulk", "1");
      if (variantIdsKey.length > 0) {
        params.set("variants", variantIdsKey);
      }
      const bulkUrl = `/api/wishlist?${params.toString()}`;
      const dedupeKey = `${product.id}|${variantIdsKey}|${authTick}`;
      const res = await fetchWishlistBulkOnce(dedupeKey, bulkUrl);
      if (cancelled) return;
      if (!res.ok) {
        setWishlistReady(true);
        return;
      }
      const json = (await res.json()) as {
        variants?: Record<string, { inWishlist: boolean }>;
        optionSnapshotFingerprints?: string[];
      };
      const vNext = new Set<string>();
      if (json.variants) {
        for (const [id, row] of Object.entries(json.variants)) {
          if (row.inWishlist) vNext.add(id);
        }
      }
      const fpNext = new Set(json.optionSnapshotFingerprints ?? []);
      setWishlistVariantIds(vNext);
      setWishlistOptionFingerprints(fpNext);
      setWishlistReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [product.id, variantIdsKey, authTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fp = await clientOptionFingerprint(keys, selection);
      if (!cancelled) setCurrentOptionFingerprint(fp);
    })();
    return () => {
      cancelled = true;
    };
  }, [keys, selection]);

  /** Exact SKU for current selection; stock + cart use this only. */
  const matchedVariant = useMemo(
    () => findVariantExact(variants, keys, selection),
    [variants, keys, selection],
  );

  const priceVariant = matchedVariant ?? variants[0];

  const [quantity, setQuantity] = useState(1);

  const maxQty = matchedVariant ? sellableQty(matchedVariant) : 0;

  /** User picks each dimension freely; we never auto-switch size/color to force a valid SKU. */
  function setOption(key: string, value: string) {
    setSelection((prev) => ({ ...prev, [key]: value }));
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
  }, [matchedVariant?.id]);

  const thumbUrl = useMemo(() => {
    if (main?.kind === "image") return main.url;
    const firstImg = gallery.find((g) => g.kind === "image");
    return firstImg?.url ?? "";
  }, [main, gallery]);

  /** Sticky bar: in-stock cart, OOS wishlist, or option-snapshot wishlist (no matching SKU yet). */
  const showStickyPurchase =
    ctaScrolledPast &&
    Boolean(variants.length > 0 && (matchedVariant || (keys.length > 0 && keys.every((k) => (selection[k] ?? "").trim() !== ""))));
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

  const selectionComplete =
    keys.length > 0 && keys.every((k) => (selection[k] ?? "").trim() !== "");
  /** Top-right image pill: real SKU with 0 stock, or full option pick with no listing yet. */
  const showImageOosBadge =
    (Boolean(matchedVariant) && maxQty < 1) ||
    (!matchedVariant && selectionComplete);

  const purchaseStockMessage =
    matchedVariant && maxQty > 0 ? `${maxQty} in stock` : "Out of stock";

  const purchaseStockBadgeClass =
    matchedVariant && maxQty > 0
      ? "border-emerald-200/90 bg-emerald-50 text-emerald-950 shadow-sm"
      : "border-neutral-800/80 bg-neutral-950/95 text-white shadow-lg backdrop-blur-sm";

  return (
    <>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-neutral-100">
            {showImageOosBadge ? (
              <div
                className="absolute right-3 top-3 z-10 max-w-[min(calc(100%-1.5rem),16rem)] rounded-lg border border-white/15 bg-neutral-950/95 px-3 py-2 text-center shadow-lg backdrop-blur-sm"
                role="status"
                aria-label="Out of stock"
              >
                <p className="text-[11px] font-semibold leading-snug text-white normal-case tracking-normal sm:text-xs">
                  Out of stock
                </p>
              </div>
            ) : null}
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

          {dimensions.length > 0 ? (
            <div className="space-y-5">
              {dimensions.map((dim) => {
                const key = dim.key;
                const heading = (dim.label?.trim() || key) as string;
                const values = [
                  ...new Set(
                    variants.map((v) => v.option_values[key]).filter(Boolean) as string[],
                  ),
                ].sort();
                const variantOptions = values.map((val) => ({ value: val, label: val }));
                const pres = dim.presentation;

                if (pres === "dropdown") {
                  return (
                    <div key={key} className="space-y-2">
                      <label
                        className="block text-xs font-semibold tracking-wide text-neutral-500"
                        htmlFor={`pdp-opt-${key.replace(/\s+/g, "-")}`}
                      >
                        {heading}
                      </label>
                      <AppSelect
                        inputId={`pdp-opt-${key.replace(/\s+/g, "-").toLowerCase()}`}
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
                }

                if (pres === "swatches") {
                  return (
                    <div key={key} className="space-y-2">
                      <span className="block text-xs font-semibold tracking-wide text-neutral-500">
                        {heading}
                      </span>
                      <div
                        className="flex flex-wrap gap-3"
                        role="group"
                        aria-label={`Select ${heading}`}
                      >
                        {values.map((val) => {
                          const selected = (selection[key] ?? "") === val;
                          const hex = hexForColorValue(variants, key, val, colorById);
                          return (
                            <button
                              key={val}
                              type="button"
                              title={val}
                              aria-pressed={selected}
                              aria-label={val}
                              onClick={() => setOption(key, val)}
                              className="group flex flex-col items-center gap-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
                            >
                              <span
                                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                                  selected
                                    ? "border-neutral-950 ring-2 ring-neutral-950 ring-offset-2"
                                    : "border-neutral-300 group-hover:border-neutral-950"
                                }`}
                                style={
                                  hex
                                    ? { backgroundColor: hex, color: "transparent" }
                                    : { backgroundColor: "#f5f5f5", color: "#525252" }
                                }
                              >
                                {!hex ? val.slice(0, 2).toUpperCase() : "\u00a0"}
                              </span>
                              <span className="max-w-[5rem] truncate text-center text-[11px] font-medium text-neutral-600">
                                {val}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                const chipClass =
                  pres === "badges"
                    ? "min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold leading-snug"
                    : "min-h-11 min-w-11 max-w-full rounded-xl border px-4 py-2.5 text-left text-sm font-semibold leading-snug sm:max-w-[14rem]";

                return (
                  <div key={key} className="space-y-2">
                    <span className="block text-xs font-semibold tracking-wide text-neutral-500">
                      {heading}
                    </span>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label={`Select ${heading}`}
                    >
                      {values.map((val) => {
                        const selected = (selection[key] ?? "") === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setOption(key, val)}
                            className={`${chipClass} max-w-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 ${
                              selected
                                ? "border-neutral-950 bg-neutral-950 text-white shadow-sm"
                                : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-950"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {variants.length > 0 && priceVariant ? (
            <div ref={purchaseBlockRef} className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-2">
                {matchedVariant ? (
                  priceVariant.compare_at_price != null &&
                  priceVariant.compare_at_price > priceVariant.price ? (
                    <>
                      <span className="text-lg text-neutral-500 line-through">
                        {formatPkr(Number(priceVariant.compare_at_price))}
                      </span>
                      <p className="text-2xl font-semibold">
                        {formatPkr(Number(priceVariant.price))}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-semibold">
                      {formatPkr(Number(priceVariant.price))}
                    </p>
                  )
                ) : (
                  <></>
                  // <p className="text-2xl font-semibold text-neutral-400">—</p>
                )}
              </div>
              <div
                role="status"
                aria-live="polite"
                className={`inline-block w-fit max-w-full rounded-lg border px-3 py-2 text-center text-[11px] font-semibold leading-snug normal-case tracking-normal sm:text-xs ${purchaseStockBadgeClass}`}
              >
                <p className="font-semibold">{purchaseStockMessage}</p>
              </div>

              {matchedVariant ? (
                maxQty > 0 ? (
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
                    <div className="flex flex-wrap items-center gap-3">
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
                        productId={product.id}
                        quantity={quantity}
                        maxQuantity={maxQty}
                        disabled={maxQty < 1}
                        openDrawer
                        itemName={product.name}
                        className="rounded-full px-6 py-3 text-sm disabled:opacity-50"
                      />
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
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
                ) : (
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <span className="mb-1 block text-xs font-medium capitalize tracking-wide text-neutral-500">
                        Quantity
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className="inline-flex items-stretch rounded-lg border border-neutral-300 bg-neutral-50"
                          role="group"
                          aria-label="Quantity (not available to change while out of stock)"
                        >
                          <button
                            type="button"
                            className="cursor-not-allowed px-3 py-2 text-sm font-semibold text-neutral-400"
                            aria-label="Decrease quantity"
                            disabled
                          >
                            −
                          </button>
                          <span className="flex min-w-11 items-center justify-center border-x border-neutral-200 px-2 py-2 text-center text-sm font-medium tabular-nums text-neutral-500">
                            1
                          </span>
                          <button
                            type="button"
                            className="cursor-not-allowed px-3 py-2 text-sm font-semibold text-neutral-400"
                            aria-label="Increase quantity"
                            disabled
                          >
                            +
                          </button>
                        </div>
                        <PdpWishlistActions
                          productId={product.id}
                          productSlug={productSlug}
                          productName={product.name}
                          dimensionKeys={keys}
                          selection={selection}
                          matchedVariant={matchedVariant ?? null}
                          maxQty={maxQty}
                          wishlistVariantIds={wishlistVariantIds}
                          wishlistOptionFingerprints={wishlistOptionFingerprints}
                          currentOptionFingerprint={currentOptionFingerprint}
                          wishlistReady={wishlistReady}
                          onWishlistBulkChange={handleWishlistBulkChange}
                          layout="inline"
                        />
                      </div>
                    </div>
                  </div>
                )
              ) : keys.length > 0 ? (
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <span className="mb-1 block text-xs font-medium capitalize tracking-wide text-neutral-500">
                      Quantity
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="inline-flex items-stretch rounded-lg border border-neutral-300 bg-neutral-50"
                        role="group"
                        aria-label="Quantity (available when this option is in stock)"
                      >
                        <button
                          type="button"
                          className="cursor-not-allowed px-3 py-2 text-sm font-semibold text-neutral-400"
                          aria-label="Decrease quantity"
                          disabled
                        >
                          −
                        </button>
                        <span className="flex min-w-11 items-center justify-center border-x border-neutral-200 px-2 py-2 text-center text-sm font-medium tabular-nums text-neutral-500">
                          1
                        </span>
                        <button
                          type="button"
                          className="cursor-not-allowed px-3 py-2 text-sm font-semibold text-neutral-400"
                          aria-label="Increase quantity"
                          disabled
                        >
                          +
                        </button>
                      </div>
                      <PdpWishlistActions
                        productId={product.id}
                        productSlug={productSlug}
                        productName={product.name}
                        dimensionKeys={keys}
                        selection={selection}
                        matchedVariant={null}
                        maxQty={0}
                        wishlistVariantIds={wishlistVariantIds}
                        wishlistOptionFingerprints={wishlistOptionFingerprints}
                        currentOptionFingerprint={currentOptionFingerprint}
                        wishlistReady={wishlistReady}
                        onWishlistBulkChange={handleWishlistBulkChange}
                        layout="inline"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
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
          {showMobileStickyBar && (matchedVariant || (keys.length > 0 && keys.every((k) => (selection[k] ?? "").trim() !== ""))) ? (
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
                  {matchedVariant && maxQty > 0 ? (
                    <>
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
                        productId={product.id}
                        quantity={quantity}
                        maxQuantity={maxQty}
                        disabled={maxQty < 1}
                        openDrawer
                        itemName={product.name}
                        className="rounded-md! px-2! py-1.5! text-[11px]! font-semibold! leading-tight! shadow-none! hover:shadow-sm! disabled:opacity-50 sm:px-2.5! sm:py-1.5! sm:text-xs!"
                      />
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
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
                    </>
                  ) : (
                    <>
                      <div
                        className="inline-flex shrink-0 items-stretch rounded-md border border-neutral-300 bg-neutral-50"
                        role="group"
                        aria-label="Quantity (not available to change while out of stock)"
                      >
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed px-1.5 py-1 text-[10px] font-semibold text-neutral-400 sm:px-2 sm:text-[11px]"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="flex min-w-7 items-center justify-center border-x border-neutral-200 px-1 text-[10px] font-medium tabular-nums text-neutral-500 sm:min-w-8 sm:text-[11px]">
                          1
                        </span>
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed px-1.5 py-1 text-[10px] font-semibold text-neutral-400 sm:px-2 sm:text-[11px]"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <PdpWishlistActions
                        productId={product.id}
                        productSlug={productSlug}
                        productName={product.name}
                        dimensionKeys={keys}
                        selection={selection}
                        matchedVariant={matchedVariant ?? null}
                        maxQty={matchedVariant ? maxQty : 0}
                        wishlistVariantIds={wishlistVariantIds}
                        wishlistOptionFingerprints={wishlistOptionFingerprints}
                        currentOptionFingerprint={currentOptionFingerprint}
                        wishlistReady={wishlistReady}
                        onWishlistBulkChange={handleWishlistBulkChange}
                        compact
                        layout="inline"
                      />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
