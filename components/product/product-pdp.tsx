"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { AddToCartVariantButton } from "@/components/cart/AddToCartVariantButton";
import {
  PdpWishlistActions,
  type PdpWishlistBulkChange,
} from "@/components/product/pdp-wishlist-actions";
import { createClient } from "@/lib/supabase/client";
import { clientOptionFingerprint } from "@/lib/wishlist-fingerprint";
import { AppSelect } from "@/components/ui/app-select";
import { StarRating } from "@/components/ui/star-rating";
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
import { formatPkr, STORE_CURRENCY_CODE } from "@/app/lib/format-currency";
import { useCart } from "@/app/providers/cart-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { metaContentsSingleItem, toPkrValue, trackMetaPixel } from "@/lib/seo/meta-pixel-client";
import { getPublicSiteUrl } from "@/lib/site-url";
import Link from "next/link";

function sellableQty(v: DbProductVariantRow): number {
  return Math.max(0, (v.quantity_on_hand ?? 0) - (v.quantity_reserved ?? 0));
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
    (x) => (x.option_values[optionKey] ?? "") === value && Boolean(x.color_id),
  );
  if (!row?.color_id) return null;
  return colorById[row.color_id]?.hex ?? null;
}

function firstImage(images: unknown): string {
  if (
    Array.isArray(images) &&
    images.length > 0 &&
    typeof images[0] === "string"
  ) {
    return images[0];
  }
  return "";
}

function normalizeWhatsAppNumber(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return digits;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2a9.91 9.91 0 0 0-8.52 15.02L2.25 22l5.1-1.22A9.91 9.91 0 1 0 12.04 2Zm0 1.75a8.16 8.16 0 1 1-4.15 15.18l-.32-.19-3.02.72.75-2.91-.21-.34A8.16 8.16 0 0 1 12.04 3.75Zm-3.37 3.8c-.18 0-.47.07-.72.34-.25.28-.95.93-.95 2.26 0 1.34.98 2.63 1.11 2.82.14.18 1.89 3.02 4.66 4.11 2.3.91 2.77.73 3.27.68.5-.04 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.12-.25-.19-.53-.33-.27-.14-1.62-.8-1.87-.89-.25-.09-.43-.14-.61.14-.18.27-.7.89-.86 1.07-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.2-1.35-.81-.72-1.36-1.62-1.52-1.89-.16-.28-.02-.42.12-.56.13-.13.28-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.13-.61-1.47-.84-2.01-.22-.52-.44-.45-.61-.46h-.52Z" />
    </svg>
  );
}

/** Dedupe concurrent identical bulk wishlist GETs (e.g. React Strict Mode double mount). Key must include auth epoch so sign-in/out never reuse another session’s response. */
const bulkWishlistInflight = new Map<string, Promise<Response>>();

function fetchWishlistBulkOnce(
  dedupeKey: string,
  url: string,
): Promise<Response> {
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
  /** When set, collection label links to the collection page (internal SEO). */
  collectionHref?: string;
  variants: DbProductVariantRow[];
  /** When set (e.g. from DB), drives gallery + video; otherwise uses `product.images` */
  assets?: DbProductAssetRow[];
  /** For color swatches; keyed by `colors.id` from variants. */
  colorById?: Record<string, ProductDetailColorMeta>;
  /**
   * Sanitized product description HTML (sanitized on the server with
   * `sanitizeRichHtml`). Empty string when there is no description.
   */
  safeDescriptionHtml: string;
};

export function ProductPdp({
  product,
  productSlug,
  optionDefinitions,
  collectionLabel,
  collectionHref = "",
  variants,
  assets,
  colorById = {},
  safeDescriptionHtml,
}: Props) {
  const showCollectionLabel =
    typeof collectionLabel === "string" &&
    collectionLabel.trim() !== "" &&
    collectionLabel.toLowerCase() !== "uncategorized";
  const { isOpen: cartDrawerOpen } = useCart();
  const { footer } = useStoreBrand();

  const variantKeys = useMemo(
    () =>
      collectOptionKeysFromVariants(variants.map((v) => v.option_values ?? {})),
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
  const viewedVariantKeysRef = useRef<Set<string>>(new Set());
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

  const handleWishlistBulkChange = useCallback(
    (patch: PdpWishlistBulkChange) => {
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
    },
    [],
  );

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
    queueMicrotask(() => {
      setWishlistReady(false);
      setWishlistVariantIds(new Set());
      setWishlistOptionFingerprints(new Set());
    });

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

  useEffect(() => {
    const variantForTracking = matchedVariant ?? priceVariant;
    if (!variantForTracking) return;
    const dedupeKey = `${product.id}:${variantForTracking.id}`;
    if (viewedVariantKeysRef.current.has(dedupeKey)) return;
    viewedVariantKeysRef.current.add(dedupeKey);
    trackMetaPixel("ViewContent", {
      content_ids: [variantForTracking.id],
      contents: metaContentsSingleItem({
        id: variantForTracking.id,
        quantity: 1,
        item_price: variantForTracking.price,
      }),
      content_type: "product",
      content_name: product.name,
      currency: STORE_CURRENCY_CODE,
      value: toPkrValue(variantForTracking.price),
    });
  }, [matchedVariant, priceVariant, product.id, product.name]);

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
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const main = gallery[activeMedia] ?? gallery[0];

  const goToNextMedia = useCallback(() => {
    if (gallery.length < 2) return;
    setSlideDir(1);
    setActiveMedia((idx) => (idx + 1) % gallery.length);
  }, [gallery.length]);

  const goToPrevMedia = useCallback(() => {
    if (gallery.length < 2) return;
    setSlideDir(-1);
    setActiveMedia((idx) => (idx - 1 + gallery.length) % gallery.length);
  }, [gallery.length]);

  const handleGalleryDragEnd = useCallback((info: PanInfo) => {
    if (gallery.length < 2) return;
    const swipe = info.offset.x + info.velocity.x * 0.2;
    const SWIPE_THRESHOLD = 72;
    if (swipe <= -SWIPE_THRESHOLD) goToNextMedia();
    else if (swipe >= SWIPE_THRESHOLD) goToPrevMedia();
  }, [gallery.length, goToNextMedia, goToPrevMedia]);

  const slideVariants = {
    enter: (dir: 1 | -1) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 1 }),
    center: { x: "0%", opacity: 1 },
    exit: (dir: 1 | -1) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 1 }),
  } as const;

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
    Boolean(
      variants.length > 0 &&
      (matchedVariant ||
        (keys.length > 0 &&
          keys.every((k) => (selection[k] ?? "").trim() !== ""))),
    );
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

  useEffect(() => {
    if (!isZoomOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEsc(ev: KeyboardEvent) {
      if (ev.key === "Escape") setIsZoomOpen(false);
    }
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onEsc);
    };
  }, [isZoomOpen]);

  const pdpEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

  const selectionComplete =
    keys.length > 0 && keys.every((k) => (selection[k] ?? "").trim() !== "");
  /** Top-right image pill: real SKU with 0 stock, or full option pick with no listing yet. */
  const showImageOosBadge =
    (Boolean(matchedVariant) && maxQty < 1) ||
    (!matchedVariant && selectionComplete);

  const purchaseStockMessage =
    matchedVariant && maxQty > 0 ? `${maxQty} in stock` : "Out of stock";
  const purchaseDiscountPct =
    matchedVariant &&
    priceVariant.compare_at_price != null &&
    priceVariant.compare_at_price > priceVariant.price
      ? Math.round((1 - Number(priceVariant.price) / Number(priceVariant.compare_at_price)) * 100)
      : null;

  const purchaseStockBadgeClass =
    matchedVariant && maxQty > 0
      ? "border-emerald-200/90 bg-emerald-50 text-emerald-950 shadow-sm"
      : "border-neutral-800/80 bg-neutral-950/95 text-white shadow-lg backdrop-blur-sm";

  const productUrl = useMemo(
    () => `${getPublicSiteUrl()}/products/${productSlug}`,
    [productSlug],
  );

  const whatsAppHref = useMemo(() => {
    const phone = normalizeWhatsAppNumber(footer.phone);
    if (!phone) return "";

    const optionLines = dimensions.flatMap((dim) => {
      const value = (selection[dim.key] ?? "").trim();
      return value ? [`${dim.label}: ${value}`] : [];
    });
    const variantForMessage = matchedVariant ?? priceVariant;
    const lines = [
      "Hi, I want to ask about this product:",
      `Product: ${product.name}`,
      ...optionLines,
      variantForMessage?.sku ? `SKU: ${variantForMessage.sku}` : "",
      variantForMessage ? `Price: ${formatPkr(Number(variantForMessage.price))}` : "",
      `Quantity: ${quantity}`,
      `Link: ${productUrl}`,
    ].filter(Boolean);

    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [
    dimensions,
    footer.phone,
    matchedVariant,
    priceVariant,
    product.name,
    productUrl,
    quantity,
    selection,
  ]);

  return (
    <>
      <section className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 *:min-w-0">
        <div className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
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
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : main ? (
              <AnimatePresence initial={false} custom={slideDir}>
                <motion.div
                  key={`pdp-main-${activeMedia}`}
                  custom={slideDir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  drag={gallery.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.14}
                  dragMomentum={false}
                  onDragEnd={(_, info) => handleGalleryDragEnd(info)}
                  style={{ touchAction: "pan-y" }}
                  className="absolute inset-0 flex items-center justify-center p-2 sm:p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={main.url}
                    alt={main.alt || product.name}
                    className="max-h-full max-w-full h-auto w-auto object-contain"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                No media
              </div>
            )}
            {main?.kind === "image" ? (
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="absolute bottom-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-neutral-950/85 text-white shadow-lg backdrop-blur-sm transition hover:bg-neutral-900"
                aria-label="Open image fullscreen"
                title="View fullscreen"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((item, i) => (
                <button
                  key={`${item.url}-${i}`}
                  type="button"
                  onMouseEnter={() => {
                    if (i === activeMedia) return;
                    setSlideDir(i > activeMedia ? 1 : -1);
                    setActiveMedia(i);
                  }}
                  onFocus={() => {
                    if (i === activeMedia) return;
                    setSlideDir(i > activeMedia ? 1 : -1);
                    setActiveMedia(i);
                  }}
                  onClick={() => {
                    if (i === activeMedia) return;
                    setSlideDir(i > activeMedia ? 1 : -1);
                    setActiveMedia(i);
                  }}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    activeMedia === i
                      ? "border-neutral-950"
                      : "border-transparent hover:border-neutral-300"
                  }`}
                >
                  {item.kind === "video" ? (
                    <span className="flex h-full w-full items-center justify-center bg-neutral-200 text-[10px] font-medium text-neutral-700">
                      Video
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.alt || `${product.name} thumbnail ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 space-y-4">
          {showCollectionLabel ? (
            <p className="text-sm capitalize tracking-wide text-neutral-500">
              {collectionHref ? (
                <Link
                  href={collectionHref}
                  className="hover:text-neutral-800 hover:underline underline-offset-4"
                >
                  {collectionLabel}
                </Link>
              ) : (
                collectionLabel
              )}
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {product.free_delivery ? (
            <p className="text-sm font-medium text-emerald-800">
              Free standard delivery on this item. Other items in your cart still use normal
              delivery rules.
            </p>
          ) : null}
          <div
            className="flex flex-wrap items-center gap-2 text-sm text-neutral-600"
            role="img"
            aria-label={`Rated ${(product.rating ?? 0).toFixed(1)} out of 5 stars`}
          >
            <StarRating value={Number(product.rating ?? 0)} />
            <span>
              {(product.rating ?? 0).toFixed(1)}/5 ({product.reviews_count ?? 0}{" "}
              reviews)
            </span>
          </div>

          {dimensions.length > 0 ? (
            <div className="space-y-5">
              {dimensions.map((dim) => {
                const key = dim.key;
                const heading = (dim.label?.trim() || key) as string;
                const values = [
                  ...new Set(
                    variants
                      .map((v) => v.option_values[key])
                      .filter(Boolean) as string[],
                  ),
                ].sort();
                const variantOptions = values.map((val) => ({
                  value: val,
                  label: val,
                }));
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
                          const hex = hexForColorValue(
                            variants,
                            key,
                            val,
                            colorById,
                          );
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
                                    ? {
                                        backgroundColor: hex,
                                        color: "transparent",
                                      }
                                    : {
                                        backgroundColor: "#f5f5f5",
                                        color: "#525252",
                                      }
                                }
                              >
                                {!hex
                                  ? val.slice(0, 2).toUpperCase()
                                  : "\u00a0"}
                              </span>
                              <span className="max-w-20 truncate text-center text-[11px] font-medium text-neutral-600">
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
                      {purchaseDiscountPct && purchaseDiscountPct > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                          {purchaseDiscountPct}% OFF
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-2xl font-semibold">
                      {formatPkr(Number(priceVariant.price))}
                    </p>
                  )
                ) : (
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold text-neutral-900">
                      {formatPkr(Number(priceVariant.price))}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Select all options to see stock and add to cart.
                    </p>
                  </div>
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
                  <div className="flex flex-nowrap items-end gap-2 sm:gap-3">
                    <div className="shrink-0">
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
                          className={`${quantity <= 1 ? "cursor-not-allowed" : "cursor-pointer"} px-2.5 py-2.5 text-sm font-semibold text-neutral-800 disabled:opacity-40 sm:px-3`}
                          aria-label="Decrease quantity"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        >
                          −
                        </button>
                        <span
                          className="flex min-w-9 items-center justify-center border-x border-neutral-200 px-1.5 py-2.5 text-center text-sm font-medium tabular-nums text-neutral-900 sm:min-w-11 sm:px-2"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {quantity}
                        </span>
                        <button
                          type="button"
                          className={`${quantity >= maxQty ? "cursor-not-allowed" : "cursor-pointer"} px-2.5 py-2.5 text-sm font-semibold text-neutral-800 disabled:opacity-40 sm:px-3`}
                          aria-label="Increase quantity"
                          disabled={quantity >= maxQty}
                          onClick={() =>
                            setQuantity((q) => Math.min(maxQty, q + 1))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 sm:gap-2.5">
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
                        productId={product.id}
                        contentId={matchedVariant.id}
                        quantity={quantity}
                        unitPricePkr={Number(matchedVariant.price)}
                        maxQuantity={maxQty}
                        disabled={maxQty < 1}
                        openDrawer
                        itemName={product.name}
                        className="min-w-0 flex-1 rounded-full px-3 py-2.5 text-xs sm:px-5 sm:py-3 sm:text-sm disabled:opacity-50"
                      />
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
                        productId={product.id}
                        contentId={matchedVariant.id}
                        quantity={quantity}
                        unitPricePkr={Number(matchedVariant.price)}
                        maxQuantity={maxQty}
                        disabled={maxQty < 1}
                        openDrawer={false}
                        redirectHref="/checkout"
                        label="Buy now"
                        itemName={product.name}
                        className="min-w-0 flex-1 rounded-full px-3 py-2.5 text-xs sm:px-5 sm:py-3 sm:text-sm disabled:opacity-50"
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
                          wishlistOptionFingerprints={
                            wishlistOptionFingerprints
                          }
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
            <p className="text-sm text-red-600">
              This product has no purchasable variants.
            </p>
          )}

          {safeDescriptionHtml || product.short_description?.trim() ? (
            <div className="space-y-3">
              {product.short_description?.trim() ? (
                <p className="text-sm leading-relaxed text-neutral-700 sm:text-[15px]">
                  {product.short_description.trim()}
                </p>
              ) : null}
              {safeDescriptionHtml ? (
                <div
                  className="max-w-full overflow-x-auto text-neutral-600 [&_a]:text-neutral-900 [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {whatsAppHref ? (
        <a
          href={whatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ask about ${product.name} on WhatsApp`}
          className={`fixed right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1fb85a] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:right-6 sm:h-14 sm:w-14 lg:bottom-6 ${
            showMobileStickyBar ? "bottom-24" : "bottom-5 sm:bottom-6"
          }`}
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      ) : null}

      <AnimatePresence>
        {isZoomOpen && main?.kind === "image" ? (
          <motion.div
            className="fixed inset-0 z-80 bg-black/92"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsZoomOpen(false)}
          >
            <button
              type="button"
              aria-label="Close fullscreen image"
              className="absolute right-4 top-4 z-81 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white"
              onClick={() => setIsZoomOpen(false)}
            >
              ✕
            </button>

            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevMedia();
                  }}
                  className="absolute left-3 top-1/2 z-81 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 px-3 py-2 text-white"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextMedia();
                  }}
                  className="absolute right-3 top-1/2 z-81 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 px-3 py-2 text-white"
                >
                  ›
                </button>
              </>
            ) : null}

            <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-4 sm:p-6">
              <AnimatePresence initial={false} custom={slideDir}>
                <motion.img
                  key={`pdp-zoom-${activeMedia}`}
                  custom={slideDir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  src={main.url}
                  alt={product.name}
                  className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                  drag={gallery.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.14}
                  dragMomentum={false}
                  onDragEnd={(_, info) => handleGalleryDragEnd(info)}
                  style={{ touchAction: "pan-y" }}
                  draggable={false}
                />
              </AnimatePresence>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Mobile / tablet: compact sticky bar — thumbnail left, small actions right; page gets bottom padding so copyright clears the bar */}
      <div className="lg:hidden" aria-hidden={!showMobileStickyBar}>
        <AnimatePresence
          onExitComplete={() => {
            const page = document.getElementById("PageContainer");
            if (page) page.style.paddingBottom = "";
          }}
        >
          {showMobileStickyBar &&
          (matchedVariant ||
            (keys.length > 0 &&
              keys.every((k) => (selection[k] ?? "").trim() !== ""))) ? (
            <motion.div
              ref={stickyBarRef}
              key="pdp-sticky-purchase"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.38, ease: pdpEase }}
              className="fixed inset-x-0 bottom-0 z-45 border-t border-neutral-200 bg-white/95 shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md"
              style={{
                paddingBottom:
                  "max(0.375rem, env(safe-area-inset-bottom, 0px))",
                paddingTop: "0.375rem",
              }}
            >
              <div className="mx-auto flex max-w-lg items-center gap-2 px-2.5 sm:gap-3 sm:px-4">
                <div
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 bg-cover bg-center sm:h-14 sm:w-14"
                  style={
                    thumbUrl
                      ? { backgroundImage: `url(${thumbUrl})` }
                      : undefined
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium leading-tight text-neutral-900 sm:text-xs">
                    {product.name}
                  </p>
                  {priceVariant ? (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      {matchedVariant &&
                      priceVariant.compare_at_price != null &&
                      priceVariant.compare_at_price > priceVariant.price ? (
                        <>
                          <span className="text-[10px] tabular-nums text-neutral-500 line-through sm:text-[11px]">
                            {formatPkr(Number(priceVariant.compare_at_price))}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-neutral-950 sm:text-sm">
                            {formatPkr(Number(priceVariant.price))}
                          </span>
                          {purchaseDiscountPct && purchaseDiscountPct > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white sm:text-[10px]">
                              {purchaseDiscountPct}% OFF
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs font-semibold tabular-nums text-neutral-950 sm:text-sm">
                          {formatPkr(Number(priceVariant.price))}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
                  {matchedVariant && maxQty > 0 ? (
                    <>
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
                        productId={product.id}
                        contentId={matchedVariant.id}
                        quantity={quantity}
                        unitPricePkr={Number(matchedVariant.price)}
                        maxQuantity={maxQty}
                        disabled={maxQty < 1}
                        openDrawer
                        itemName={product.name}
                        className="rounded-md! px-2! py-1.5! text-[11px]! font-semibold! leading-tight! shadow-none! hover:shadow-sm! disabled:opacity-50 sm:px-2.5! sm:py-1.5! sm:text-xs!"
                      />
                      <AddToCartVariantButton
                        variantId={matchedVariant.id}
                        productId={product.id}
                        contentId={matchedVariant.id}
                        quantity={quantity}
                        unitPricePkr={Number(matchedVariant.price)}
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
