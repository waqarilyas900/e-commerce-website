"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { useCart } from "@/app/providers/cart-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { HeaderAccount } from "@/components/auth/HeaderAccount";
import { HeaderSearchPopover } from "@/components/HeaderSearchPopover";
import { SaleBoltIcon } from "@/components/icons/sale-bolt-icon";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MobileNavDrawer } from "@/components/navigation/mobile-nav-drawer";
import { StoreLogoMark } from "@/components/store-logo-mark";
import { primaryNavLinkClass, ShopCollectionsMenu } from "@/components/navigation/shop-collections-menu";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import type { Product } from "@/app/lib/catalog/types";
import { formatPkr } from "@/app/lib/format-currency";
import DOMPurify from "isomorphic-dompurify";
import { isEffectivelyEmptyHtml } from "@/app/lib/html-content";

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
  const sanitized = useMemo(() => {
    return messagesHtml
      .map((raw) =>
        DOMPurify.sanitize(raw.trim(), {
          USE_PROFILES: { html: true },
        }),
      )
      .filter((s) => s.length > 0);
  }, [messagesHtml]);

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

/** Matches `TopStrip` visibility — search overlay `top` must include strip height only when it renders. */
const SEARCH_PANEL_TOP_WITH_STRIP =
  "top-[101px] sm:top-[109px] md:top-[120px]";
const SEARCH_PANEL_TOP_HEADER_ONLY =
  "top-[64px] sm:top-[72px] md:top-[83px]";

export function Header() {
  const { storeName, announcementBar } = useStoreBrand();
  const headerNavItems = useHeaderNavMenuItems();
  const { openCart, itemCount } = useCart();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [stickyActive, setStickyActive] = useState(false);

  const topStripVisible = useMemo(() => {
    if (!announcementBar?.enabled) return false;
    return announcementBar.messages.some((m) => !isEffectivelyEmptyHtml(m));
  }, [announcementBar]);

  useEffect(() => {
    const sync = () => {
      setStickyActive(document.body.getAttribute("data-header-sticky") === "true");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-header-sticky"],
    });
    return () => observer.disconnect();
  }, []);

  const headerContent = (isStickyHeader: boolean) => (
    <div className="header-wrapper mx-auto grid min-h-[64px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 shell-x sm:min-h-[72px] md:min-h-[83px]">
      <div className="flex h-full min-h-0 min-w-0 items-center gap-3 justify-self-start">
        <button
          type="button"
          className="flex items-center gap-2 text-neutral-800 md:hidden"
          aria-label="Site navigation"
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen((o) => !o)}
        >
          <span className="text-xl leading-none">☰</span>
        </button>
        <nav
          className="hidden items-center gap-4 md:flex lg:gap-5"
          aria-label="Primary"
        >
          <ShopCollectionsMenu />
          {headerNavItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`${primaryNavLinkClass} inline-flex items-center gap-1 rounded-md px-0.5 py-1 hover:text-neutral-950`}
            >
              {item.slug === "sale" ? (
                <SaleBoltIcon className="h-[15px] w-[15px] shrink-0" aria-hidden />
              ) : null}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <Link
        href="/"
        className="flex h-full min-h-0 min-w-0 max-w-[min(100%,240px)] items-center justify-center gap-2 justify-self-center self-center sm:max-w-none md:gap-2.5"
      >
        <StoreLogoMark size={40} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
        <span className="hidden min-w-0 max-h-12 truncate text-center text-sm font-semibold capitalize leading-tight tracking-wide text-neutral-900 sm:inline md:text-base">
          {storeName}
        </span>
      </Link>
      <div className="flex min-h-0 items-center justify-end gap-0.5 text-neutral-800 sm:gap-2 lg:gap-3">
        <HeaderAccount />
        <HeaderSearchPopover
          open={searchOpen}
          onOpenChange={setSearchOpen}
          renderPanel={isStickyHeader ? stickyActive : !stickyActive}
          panelOffsetClass={
            isStickyHeader
              ? SEARCH_PANEL_TOP_HEADER_ONLY
              : topStripVisible
                ? SEARCH_PANEL_TOP_WITH_STRIP
                : SEARCH_PANEL_TOP_HEADER_ONLY
          }
        />
        <button
          type="button"
          onClick={() => openCart()}
          className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2.5 lg:gap-2"
          aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6"
            aria-hidden
          >
            <circle cx="9" cy="20" r="1.5" />
            <circle cx="18" cy="20" r="1.5" />
            <path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 7H7.2" />
          </svg>
          {itemCount > 0 ? (
            <span className="absolute -right-0.5 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white sm:right-0">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          ) : null}
          <span className="sr-only">Cart</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <header id="site-header" className="border-b border-neutral-200 bg-white">
        {headerContent(false)}
      </header>
      <header id="site-header-sticky" className="border-b border-neutral-200 bg-white">
        <div className="pointer-events-auto">{headerContent(true)}</div>
      </header>

      <MobileNavDrawer open={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <CartDrawer />
    </>
  );
}

/**
 * Hosts where we use `<img>` instead of `next/image`: `remotePatterns` may be correct in
 * `next.config` but dev/prod can still throw (stale Turbopack cache, deploy drift). Plain `<img>`
 * skips the optimizer allowlist for these URLs.
 */
function productImageUseNativeImg(src: string): boolean {
  if (!src || src.startsWith("/")) return false;
  try {
    const h = new URL(src).hostname.toLowerCase();
    if (h === "ibrahimstores.com" || h === "www.ibrahimstores.com") return true;
    if (h === "kwcdn.com" || h.endsWith(".kwcdn.com")) return true;
    if (h === "m.media-amazon.com" || h.endsWith(".media-amazon.com")) return true;
    if (h.endsWith(".ssl-images-amazon.com")) return true;
    return false;
  } catch {
    return false;
  }
}

function ProductCardStarRow({ rating }: { rating: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return (
    <div
      className="mt-0.5 flex gap-px text-[13px] leading-none sm:text-sm"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= filled ? "text-amber-400" : "text-neutral-200"} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

export function ProductCard({
  product,
  showAddToCart = true,
  rail = false,
  revealDelay = 0,
  /** Grids (collections, search): 2-line title clamp so row heights stay even with stretch layout. */
  clampTitle = false,
}: {
  product: Product;
  /** Set false on the home page to hide quick-add (use PDP or other pages to purchase). */
  showAddToCart?: boolean;
  /** Home horizontal rail: stable card height + 2-line title clamp. */
  rail?: boolean;
  revealDelay?: number;
  clampTitle?: boolean;
}) {
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
    "whitespace-nowrap px-2.5 py-1.5 text-[11px] font-semibold tracking-wide sm:px-3.5 sm:py-2 sm:text-xs";

  const useNativeProductImg = Boolean(product.image && productImageUseNativeImg(product.image));
  /**
   * Fill the frame (no letterboxing). Grid: `object-top` keeps more of the packshot visible like
   * storefront refs; rail: centered for horizontal tiles.
   */
  const productImgClassName = rail
    ? "object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
    : "object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]";

  return (
    <motion.article
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, delay: revealDelay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/products/${product.slug}`}
        className="group relative block shrink-0"
      >
        <div
          className={
            rail
              ? "relative h-56 w-full overflow-hidden bg-neutral-100 sm:h-60"
              : "relative aspect-4/5 w-full overflow-hidden bg-neutral-50 sm:aspect-auto sm:h-60"
          }
        >
          {product.image ? (
            useNativeProductImg ? (
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full ${productImgClassName}`}
              />
            ) : (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes={
                  rail
                    ? "(max-width: 767px) 55vw, 280px"
                    : "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                }
                className={productImgClassName}
              />
            )
          ) : null}
        </div>
        {badgeLabel ? (
          <span
            className={`pointer-events-none absolute right-0 top-0 z-10 uppercase leading-tight tracking-wide ${badgeSizeClass} ${badgeClass} rounded-none`}
          >
            {badgeLabel}
          </span>
        ) : null}
      </Link>
      {/* Single column: mt-auto only on the button so it pins to the bottom when the row stretches */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 p-2 text-[13px] leading-snug text-neutral-900 sm:gap-1.5 sm:p-2.5 sm:text-sm">
        <Link
          href={`/products/${product.slug}`}
          className={
            rail || clampTitle
              ? "product-card-title-clamp block min-h-9 font-semibold leading-snug text-neutral-900"
              : "block font-semibold leading-snug text-neutral-900"
          }
        >
          {product.name}
        </Link>
        {product.reviews > 0 || product.rating > 0 ? (
          <ProductCardStarRow rating={product.rating} />
        ) : null}
        {product.compareAtPrice != null && product.compareAtPrice > product.price ? (
          <>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              <span className="text-neutral-500 line-through">{formatPkr(product.compareAtPrice)}</span>
              <span className="font-semibold text-neutral-900">{formatPkr(product.price)}</span>
            </div>
            <p className="text-[12px] font-medium text-red-600 sm:text-[13px]">
              Save {formatPkr(product.compareAtPrice - product.price)}
            </p>
          </>
        ) : (
          <p className="mt-0.5 font-semibold text-neutral-900">{formatPkr(product.price)}</p>
        )}
        {showAddToCart ? (
          <div className="mt-auto pt-1 sm:pt-2">
            <AddToCartButton
              product={product}
              openDrawer
              className="w-full rounded-md py-1.5 text-[11px] sm:py-2 sm:text-xs"
              label="Add to cart"
            />
          </div>
        ) : (
          <div className="mt-auto" aria-hidden />
        )}
      </div>
    </motion.article>
  );
}

/**
 * ~1 full card + peek of next (reference store). Visible ≈ W + gap + W/2 → W = (viewport pad − gap) / 1.5
 * ul bleeds with `-mx-2` / `px-2` to match `.shell-x`; gap-1 → 0.25rem
 */
const RAIL_COL =
  "w-[calc((100vw-1.25rem)/1.5)] min-w-[172px] max-w-[232px] shrink-0 sm:w-[200px] sm:max-w-none md:w-[220px]";
const RAIL_SNAP = "snap-start snap-always";
/** Product tile in the home rail (same as `${RAIL_COL} ${RAIL_SNAP} flex flex-col`). */
const RAIL_ITEM = `${RAIL_COL} ${RAIL_SNAP} flex flex-col`;
/** Compact “View all” control (centered in column; not full card height). */
const RAIL_VIEW_ALL_BTN =
  "flex aspect-square w-[min(7rem,78%)] max-w-[120px] flex-col items-center justify-center rounded-md border border-neutral-200 bg-white px-2 py-2 text-center text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:shadow";
const RAIL_PREVIEW = 4;

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
    return (
      <section className="bg-neutral-100/80">
        <ScrollReveal className="mx-auto max-w-7xl shell-x py-5 sm:py-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h2>
            <Link
              href={viewAllHref}
              className="hidden shrink-0 text-sm font-semibold text-neutral-900 md:inline"
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
              <li
                className={`${RAIL_COL} ${RAIL_SNAP} flex flex-col items-center justify-center`}
              >
                <Link
                  href={viewAllHref}
                  aria-label={`View all ${count} product${count === 1 ? "" : "s"} in ${title}`}
                  className={RAIL_VIEW_ALL_BTN}
                >
                  <span className="text-sm font-semibold tracking-tight">View all</span>
                  <span className="mt-1 text-xs leading-tight text-neutral-500">
                    {count} product{count === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            </RailScrollStrip>
          </div>
          <div className="hidden items-stretch gap-1 sm:gap-1.5 md:grid md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
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
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-neutral-900">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2 items-stretch">
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
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
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
              className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold capitalize text-white"
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

