"use client";

import Link from "next/link";
import Image from "next/image";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { StarRating } from "@/components/ui/star-rating";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useProductPreview } from "@/app/providers/product-preview-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { HeaderNavV2 } from "@/components/navigation/header-nav-v2";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { RiseUpTitle } from "@/components/ui/rise-up-title";
import { homeSectionTitleClass, mobileHeadingSizeClass } from "@/components/ui/home-section-title";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";
import { ProductCardPrice } from "@/components/ui/product-card-price";
import type { Product } from "@/app/lib/catalog/types";
import { isEffectivelyEmptyHtml } from "@/app/lib/html-content";

function CartGlyph({ className }: { className?: string }) {
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
      <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h7.4a1.5 1.5 0 0 0 1.5-1.2L20 8H7" />
    </svg>
  );
}
const stripShellClass =
  "shopify-section shopify-section-group-header-group flex min-h-[37px] w-full shrink-0 items-center justify-center overflow-hidden shell-x py-1.5 text-center text-[13px] font-medium leading-snug tracking-wide";

const announcementProseClass =
  "announcement-bar-prose w-full text-center [&_a]:underline [&_a]:text-inherit [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_p]:m-0 [&_p]:inline [&_strong]:font-semibold";

type AnnouncementRotatorProps = {
  messagesHtml: string[];
  backgroundColor: string;
  textColor: string;
  intervalMs: number;
};

function AnnouncementMessageRotator({
  messagesHtml,
  backgroundColor,
  textColor,
  intervalMs,
}: AnnouncementRotatorProps) {
  // `messagesHtml` is sanitized on the server before reaching the client (see
  // `getAnnouncementBarForLayout`). Just drop any empties so the rotator never
  // pauses on a blank slot.
  const sanitized = useMemo(
    () => messagesHtml.map((raw) => raw.trim()).filter((s) => s.length > 0),
    [messagesHtml],
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (sanitized.length <= 1) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % sanitized.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [sanitized.length, intervalMs]);

  if (sanitized.length === 0) {
    return null;
  }

  if (sanitized.length === 1) {
    return (
      <div
        id="shopify-section-announcement-bar"
        className={stripShellClass}
        style={{ backgroundColor, color: textColor }}
      >
        <div
          className={`${announcementProseClass} mx-auto max-w-5xl`}
          dangerouslySetInnerHTML={{ __html: sanitized[0]! }}
        />
      </div>
    );
  }

  return (
    <div
      id="shopify-section-announcement-bar"
      className={stripShellClass}
      style={{ backgroundColor, color: textColor }}
      aria-live="polite"
    >
      <div className="relative mx-auto w-full max-w-5xl">
        <div className="relative flex min-h-5 w-full items-center justify-center">
          {sanitized.map((html, i) => {
            const active = i === index % sanitized.length;
            return (
              <div
                key={i}
                className={`${announcementProseClass} absolute inset-x-0 top-1/2 mx-auto max-w-5xl -translate-y-1/2 px-1`}
                style={{
                  opacity: active ? 1 : 0,
                  transition: "opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
                  pointerEvents: active ? "auto" : "none",
                  zIndex: active ? 2 : 0,
                }}
                aria-hidden={!active}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TopStrip() {
  const { announcementBar } = useStoreBrand();

  if (!announcementBar || !announcementBar.enabled) {
    return null;
  }
  const bg = announcementBar.backgroundColor;
  const fg = announcementBar.textColor;
  const rotationMs = announcementBar.rotationIntervalMs;
  const richMessages = announcementBar.messages.filter((m) => !isEffectivelyEmptyHtml(m));

  if (richMessages.length === 0) {
    return null;
  }

  return (
    <AnnouncementMessageRotator
      messagesHtml={richMessages}
      backgroundColor={bg}
      textColor={fg}
      intervalMs={rotationMs}
    />
  );
}

export function Header() {
  return <HeaderNavV2 />;
}

/**
 * Decide whether a product image should render via plain `<img>` (bypassing
 * `next/image` and its host allowlist) or via the optimizer.
 *
 * Default is **plain `<img>` for any external host** so supplier CDN URLs
 * (Squarespace, Joom, Amazon mirrors, etc.) can never trip the
 * "hostname is not configured" runtime error — admins paste arbitrary URLs
 * into the product editor and we don't want every new host to require a
 * `next.config.ts` edit + redeploy.
 *
 * We only return `false` (→ use `next/image`) for hosts we control and have
 * explicitly configured: our own storefront/site host, the Supabase public
 * storage bucket, and Unsplash (used for design stubs). This gives us the
 * optimizer's srcset/WebP conversion on first-party media while keeping
 * third-party URLs resilient.
 */
function productImageUseNativeImg(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return false;
  }
  let host: string;
  try {
    host = new URL(src).hostname.toLowerCase();
  } catch {
    return false;
  }

  const siteHostRaw = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_DEV_SITE_ORIGIN ||
    ""
  ).trim();
  let siteHost = "";
  if (siteHostRaw) {
    try {
      siteHost = new URL(siteHostRaw).hostname.toLowerCase();
    } catch {
      /* ignore */
    }
  }
  const cdnHost = (process.env.NEXT_PUBLIC_CDN_IMAGE_HOST || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "");

  if (siteHost && (host === siteHost || host === `www.${siteHost}`)) return false;
  if (cdnHost && host === cdnHost) return false;
  if (host.endsWith(".supabase.co")) return false;
  if (host === "images.unsplash.com") return false;

  return true;
}

function ProductCardStarRow({ rating }: { rating: number }) {
  return (
    <div className="leading-none">
      <StarRating value={rating} size={13} labeled />
    </div>
  );
}

export function ProductCard({
  product,
  showAddToCart = true,
  rail = false,
  revealDelay = 0,
  /** 2-line title clamp so row heights stay even (default on — home density). */
  clampTitle = true,
  /** Above-the-fold tiles: skip lazy load for faster LCP. */
  priorityImage = false,
}: {
  product: Product;
  /** Set false on the home page to hide quick-add (use PDP or other pages to purchase). */
  showAddToCart?: boolean;
  /** Home horizontal rail: tighter image `sizes` hint. */
  rail?: boolean;
  revealDelay?: number;
  clampTitle?: boolean;
  priorityImage?: boolean;
}) {
  const { openPreview } = useProductPreview();
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!product?.slug) {
    return null;
  }

  const salePct =
    product.compareAtPrice != null && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;
  const soldOut = product.inStock === false;
  const badgeLabel = soldOut ? "Sold out" : salePct != null ? `${salePct}% off` : null;
  const badgeClass = soldOut
    ? "bg-black text-white"
    : "bg-red-600 text-white";
  const badgeSizeClass =
    "whitespace-nowrap px-1.5 py-1 text-[10px] font-semibold tracking-wide sm:px-2.5 sm:py-1.5 sm:text-[11px]";

  const useNativeProductImg = Boolean(product.image && productImageUseNativeImg(product.image));
  /**
   * `object-cover` + `object-top` fills the tile edge-to-edge (no grey band under the photo).
   * Top alignment keeps packshots/labeled tops visible; a sliver of the bottom may crop — same
   * trade-off as typical listing grids when the photo isn’t exactly the tile aspect ratio.
   * Image frame is always square (home rail density) site-wide.
   */
  const productImgClassName =
    `object-cover object-top transition-[transform,opacity] duration-500 group-hover:scale-[1.02] ${
      imageLoaded ? "opacity-100" : "opacity-0"
    }`;
  const productImgFitStyle = {
    objectFit: "cover" as const,
    objectPosition: "top center" as const,
  };

  const openQuickPreview = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPreview(product);
  };

  return (
    <article
      className="product-card-reveal group/card flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white"
      style={
        revealDelay > 0
          ? ({ ["--card-reveal-delay"]: `${revealDelay}s` } as CSSProperties)
          : undefined
      }
    >
      <div className="relative shrink-0">
        <HoverPrefetchLink
          href={`/products/${product.slug}`}
          prefetch
          className="group relative block"
        >
          <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
            {product.image ? (
              useNativeProductImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={optimizeSupplierImageUrl(product.image, rail ? 360 : 400)}
                  alt={product.name}
                  loading={priorityImage ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={priorityImage ? "high" : "auto"}
                  width={rail ? 360 : 400}
                  height={rail ? 360 : 400}
                  style={productImgFitStyle}
                  className={`absolute inset-0 h-full w-full ${productImgClassName}`}
                  onLoad={() => setImageLoaded(true)}
                />
              ) : (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  priority={priorityImage}
                  sizes={
                    rail
                      ? "(max-width: 767px) 40vw, (max-width: 1023px) 30vw, 20vw"
                      : "(max-width: 767px) 50vw, (max-width: 1023px) 34vw, 20vw"
                  }
                  style={productImgFitStyle}
                  className={productImgClassName}
                  onLoad={() => setImageLoaded(true)}
                />
              )
            ) : null}
          </div>
        </HoverPrefetchLink>

        {badgeLabel ? (
          <span
            className={`pointer-events-none absolute right-0 top-0 z-10 uppercase leading-tight tracking-wide ${badgeSizeClass} ${badgeClass} rounded-none`}
          >
            {badgeLabel}
          </span>
        ) : null}

        {/* AliExpress-style rounded cart — always on mobile, hover on desktop */}
        <button
          type="button"
          onClick={openQuickPreview}
          aria-label={`Preview ${product.name}`}
          className="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1c1d1d] shadow-md ring-1 ring-black/5 transition hover:bg-[#E0703A] hover:text-white sm:bottom-12 sm:h-9 sm:w-9 sm:opacity-0 sm:pointer-events-none sm:group-hover/card:opacity-100 sm:group-hover/card:pointer-events-auto"
        >
          <CartGlyph className="h-[18px] w-[18px]" />
        </button>

        {/* AliExpress-style See preview — desktop hover only */}
        <button
          type="button"
          onClick={openQuickPreview}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden h-10 translate-y-full items-center justify-center bg-black/70 text-[12px] font-semibold uppercase tracking-wide text-white opacity-0 transition hover:bg-black/80 sm:flex sm:group-hover/card:pointer-events-auto sm:group-hover/card:translate-y-0 sm:group-hover/card:opacity-100"
        >
          See preview
        </button>
      </div>

      {/* Tight stack — same density as home rails (square image + compact copy). */}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-1.5 pb-1.5 pt-1 text-[12px] leading-snug text-neutral-900 sm:gap-1 sm:px-2.5 sm:pb-2.5 sm:pt-1.5 sm:text-sm">
        <div className="flex flex-col gap-0">
          <HoverPrefetchLink
            href={`/products/${product.slug}`}
            prefetch
            className={
              rail || clampTitle
                ? "product-card-title-clamp block font-semibold leading-tight text-neutral-900"
                : "block font-semibold leading-tight text-neutral-900"
            }
          >
            {product.name}
          </HoverPrefetchLink>
          {product.reviews > 0 || product.rating > 0 ? (
            <ProductCardStarRow rating={product.rating} />
          ) : null}
        </div>
        <ProductCardPrice price={product.price} compareAtPrice={product.compareAtPrice} />
        {showAddToCart ? (
          <div className="mt-auto pt-1 sm:pt-1.5">
            <AddToCartButton
              product={product}
              openDrawer
              className="w-full"
              label="Add to cart"
            />
          </div>
        ) : (
          <div className="mt-auto" aria-hidden />
        )}
      </div>
    </article>
  );
}

/**
 * Site-wide product card density: 2 cols mobile → 3 tablet → 5 desktop.
 * Use everywhere product cards sit in a grid (home, collections, search, PDP, etc.).
 */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-5 lg:gap-2";
/** Same as PRODUCT_GRID_CLASS but hidden until md (mobile uses horizontal rail). */
export const PRODUCT_GRID_DESKTOP_CLASS =
  "hidden items-stretch gap-1 sm:gap-1.5 md:grid md:grid-cols-3 md:gap-2 lg:grid-cols-5 lg:gap-2";

/**
 * Mobile: ~2.15 cards + peek (home density). sm+: wider tiles for tablet rail.
 * Shared by home, PDP related, recently viewed — keep one system size.
 */
export const PRODUCT_RAIL_COL =
  "w-[calc((100vw-1rem)/2.15)] min-w-[128px] max-w-[152px] shrink-0 sm:w-[168px] sm:max-w-[180px]";
const RAIL_SNAP = "snap-start snap-always";
/** Product tile in horizontal rails (home / PDP / recently viewed). */
export const PRODUCT_RAIL_ITEM = `${PRODUCT_RAIL_COL} ${RAIL_SNAP} flex flex-col`;
const RAIL_ITEM = PRODUCT_RAIL_ITEM;
const RAIL_PREVIEW = 5;

/** Trailing rail tile — blurred product photo + “View all products” (shop-collections style). */
function ViewAllRailTile({
  href,
  title,
  count,
  imageUrl,
}: {
  href: string;
  title: string;
  count: number;
  imageUrl: string;
}) {
  const useNative = Boolean(imageUrl && productImageUseNativeImg(imageUrl));
  const imgSrc = imageUrl ? optimizeSupplierImageUrl(imageUrl, 400) : "";

  return (
    <Link
      href={href}
      aria-label={`View all ${count} product${count === 1 ? "" : "s"} in ${title}`}
      className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-neutral-900 shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:border-[#E0703A]/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0703A]"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {imgSrc ? (
          useNative ? (
            // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs outside next/image allowlist
            <img
              src={imgSrc}
              alt={`${title} collection preview`}
              loading="lazy"
              decoding="async"
              width={400}
              height={500}
              className="absolute inset-0 h-full w-full scale-110 object-cover object-top blur-[2.5px] brightness-[0.72] transition duration-700 ease-out group-hover:scale-[1.16] group-hover:blur-[1.5px] group-hover:brightness-[0.65]"
            />
          ) : (
            <Image
              src={imageUrl}
              alt={`${title} collection preview`}
              fill
              sizes="(max-width: 767px) 40vw, 300px"
              className="scale-110 object-cover object-top blur-[2.5px] brightness-[0.72] transition duration-700 ease-out group-hover:scale-[1.16] group-hover:blur-[1.5px] group-hover:brightness-[0.65]"
            />
          )
        ) : (
          <div className="absolute inset-0 bg-neutral-800" aria-hidden />
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[#1c1d1d]/25 backdrop-blur-[1px]"
          aria-hidden
        />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 px-2 py-3 text-center">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-[#1c1d1d] shadow-sm backdrop-blur-md transition duration-300 group-hover:bg-[#E0703A] group-hover:text-white"
            aria-hidden
          >
            →
          </span>
          <span className="text-[11px] font-semibold leading-snug tracking-tight text-white drop-shadow-sm">
            View all
          </span>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#1c1d1d] shadow-sm backdrop-blur-md transition group-hover:bg-[#E0703A] group-hover:text-white">
            {count}{" "}
            <span className="font-medium normal-case tracking-normal opacity-90">
              {count === 1 ? "product" : "products"}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

const RAIL_SCROLL_HIDE_MS = 700;

/** Horizontal rail: scrollbar only while user is scrolling; hidden after scroll stops. */
function RailScrollStrip({ children }: { children: ReactNode }) {
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [barVisible, setBarVisible] = useState(false);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBarVisible(false), RAIL_SCROLL_HIDE_MS);
  }, []);

  const onScroll = useCallback(() => {
    setBarVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const railUlClass =
    "rail-scroll -mx-2 flex list-none items-stretch gap-1 overflow-x-auto scroll-px-2 scroll-smooth px-2 pb-2 pt-1 snap-x snap-mandatory sm:mx-0 sm:gap-1.5 sm:px-0 sm:scroll-px-0";

  return (
    <ul
      onScroll={onScroll}
      className={barVisible ? `${railUlClass} rail-scroll--interacting` : railUlClass}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children}
    </ul>
  );
}

/** Home rail category titles — same weight/appear as other home section titles. */
const homeRailTitleClass = homeSectionTitleClass;

export function ProductSection({
  title,
  items,
  viewAllHref = "/collections",
  showAddToCart = true,
  layout = "grid",
  totalProductCount,
}: {
  title: string;
  items: Product[];
  viewAllHref?: string;
  showAddToCart?: boolean;
  /** Home collection rails: horizontal scroll + trailing “View all” tile. */
  layout?: "grid" | "rail";
  /** Full collection (or sale) size for the rail “View all” tile; defaults to `items.length`. */
  totalProductCount?: number;
}) {
  const count = totalProductCount ?? items.length;
  const railItems = layout === "rail" ? items.slice(0, RAIL_PREVIEW) : items;

  if (layout === "rail") {
    const viewAllImage =
      railItems.find((p) => (p.image ?? "").trim())?.image?.trim() ??
      items.find((p) => (p.image ?? "").trim())?.image?.trim() ??
      "";

    return (
      <section className="bg-neutral-100/80">
        <ScrollReveal className="mx-auto max-w-7xl shell-x py-3.5 sm:py-6">
          <div className="relative mb-3 flex items-end justify-between gap-3 sm:mb-5 sm:justify-center">
            <RiseUpTitle className="min-w-0 text-left sm:text-center">
              <h2 className={`${homeRailTitleClass} !text-[1.05rem] sm:!text-[clamp(1.35rem,2.4vw,1.75rem)]`}>
                {title}
              </h2>
            </RiseUpTitle>
            <Link
              href={viewAllHref}
              className="shrink-0 text-[12px] font-semibold text-neutral-900 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:text-sm"
            >
              View all
            </Link>
          </div>
          <div className="md:hidden">
            <RailScrollStrip>
              {railItems.map((product, idx) => (
                <li key={product.id} className={RAIL_ITEM}>
                  <div className="flex h-full min-h-0 flex-1 flex-col">
                    <ProductCard
                      product={product}
                      showAddToCart={showAddToCart}
                      rail
                      clampTitle
                      revealDelay={Math.min(idx * 0.09, 0.36)}
                    />
                  </div>
                </li>
              ))}
              <li className={RAIL_ITEM}>
                <ViewAllRailTile
                  href={viewAllHref}
                  title={title}
                  count={count}
                  imageUrl={viewAllImage}
                />
              </li>
            </RailScrollStrip>
          </div>
          <div className={PRODUCT_GRID_DESKTOP_CLASS}>
            {railItems.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                showAddToCart={showAddToCart}
                clampTitle
                revealDelay={Math.min(idx * 0.08, 0.36)}
              />
            ))}
          </div>
        </ScrollReveal>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl shell-x py-5 sm:py-6">
      <ScrollReveal>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className={`${mobileHeadingSizeClass} font-semibold tracking-tight sm:text-xl sm:leading-normal`}>
            {title}
          </h2>
          <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-neutral-900">
            View all
          </Link>
        </div>
        <div className={PRODUCT_GRID_CLASS}>
          {items.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              showAddToCart={showAddToCart}
              clampTitle
              revealDelay={Math.min(idx * 0.08, 0.36)}
            />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

export function WhyShop() {
  const { whyShop } = useStoreBrand();
  const hasImage = whyShop.imageUrl.trim().length > 0;
  const hasCopy =
    whyShop.title.trim().length > 0 ||
    whyShop.body.trim().length > 0 ||
    whyShop.eyebrow.trim().length > 0;

  if (!hasImage && !hasCopy) {
    return null;
  }

  return (
    <section className="border-t border-neutral-200 bg-white py-12 sm:py-16">
      <ScrollReveal
        className={`mx-auto grid max-w-7xl gap-8 shell-x md:items-center md:gap-12 ${
          hasImage ? "md:grid-cols-2" : "md:grid-cols-1"
        }`}
      >
        {hasImage ? (
          <Link
            href={whyShop.ctaHref}
            className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-neutral-100 md:aspect-square"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{
                backgroundImage: `url(${whyShop.imageUrl})`,
              }}
            />
          </Link>
        ) : null}
        <div>
          {whyShop.eyebrow.trim() ? (
            <p className="text-sm font-medium text-neutral-500">{whyShop.eyebrow}</p>
          ) : null}
          {whyShop.title.trim() ? (
            <h2 className={`mt-2 ${mobileHeadingSizeClass} font-semibold tracking-tight sm:text-3xl sm:leading-normal`}>
              {whyShop.title}
            </h2>
          ) : null}
          {whyShop.body.trim() ? (
            <p className="mt-4 text-sm leading-relaxed text-neutral-700 sm:text-base">
              {whyShop.body}
            </p>
          ) : null}
          {whyShop.ctaLabel.trim() ? (
            <Link
              href={whyShop.ctaHref}
              className="mt-6 inline-flex btn rounded-none bg-black text-white"
            >
              {whyShop.ctaLabel}
            </Link>
          ) : null}
          {whyShop.reviewsLine.trim() ? (
            <p className="mt-6 text-sm text-neutral-600">{whyShop.reviewsLine}</p>
          ) : null}
        </div>
      </ScrollReveal>
    </section>
  );
}

export { Footer } from "./site-footer";

