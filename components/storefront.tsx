"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/app/providers/cart-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { HeaderAccount } from "@/components/auth/HeaderAccount";
import { HeaderSearchPopover } from "@/components/HeaderSearchPopover";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MobileNavDrawer } from "@/components/navigation/mobile-nav-drawer";
import { primaryNavLinkClass, ShopCollectionsMenu } from "@/components/navigation/shop-collections-menu";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  bundles,
  collections,
  promoSlides,
  type Product,
} from "@/app/lib/store-data";
import { formatPkr } from "@/app/lib/format-currency";

export function TopStrip() {
  const { announcement } = useStoreBrand();
  return (
    <div
      id="shopify-section-announcement-bar"
      className="shopify-section shopify-section-group-header-group flex h-[37px] w-full shrink-0 items-center justify-center overflow-hidden bg-[#1c1d1d] px-4 text-center text-[13px] font-medium leading-none tracking-wide text-white"
    >
      <span className="block max-w-full truncate px-1 capitalize">{announcement}</span>
    </div>
  );
}

export function Header() {
  const { storeName } = useStoreBrand();
  const { openCart, itemCount } = useCart();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [stickyActive, setStickyActive] = useState(false);

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
    <div className="header-wrapper mx-auto grid min-h-[64px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:min-h-[72px] sm:px-6 md:min-h-[83px] lg:px-8">
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
          <Link
            href="/collections/sale"
            className={`${primaryNavLinkClass} inline-flex items-center rounded-md px-0.5 py-1 hover:text-neutral-950`}
          >
            <span aria-hidden className="mr-0.5 inline text-[15px] leading-none">
              ⚡
            </span>
            Sale
          </Link>
          <Link
            href="/bundles"
            className={`${primaryNavLinkClass} inline-flex items-center rounded-md px-0.5 py-1 hover:text-neutral-950`}
          >
            <span aria-hidden className="mr-0.5 inline text-[15px] leading-none">
              🔥
            </span>
            Bundle Deals
          </Link>
        </nav>
      </div>
      <Link
        href="/"
        className="flex h-full min-h-0 min-w-0 max-w-[min(100%,240px)] items-center justify-center gap-2 justify-self-center self-center sm:max-w-none md:gap-2.5"
      >
        <Image
          src="/dummy-logo.svg"
          alt=""
          width={40}
          height={40}
          priority
          className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
        />
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
              ? "top-[64px] sm:top-[72px] md:top-[83px]"
              : "top-[101px] sm:top-[109px] md:top-[120px]"
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
            <span className="absolute -right-0.5 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white sm:right-0">
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

export function Hero() {
  const featuredSlides = promoSlides.slice(0, 5);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div
          className="relative min-h-[430px] overflow-hidden rounded-xl bg-cover bg-center"
          style={{ backgroundImage: `url(${featuredSlides[0].image})` }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative flex min-h-[430px] flex-col justify-end p-7 text-white sm:p-10">
            <p className="text-xs font-semibold capitalize tracking-[0.2em]">Brand New</p>
            <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">
              {featuredSlides[0].title}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">
              {featuredSlides[0].subtitle}
            </p>
            <Link
              href={featuredSlides[0].href}
              className="mt-5 w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold capitalize text-black"
            >
              {featuredSlides[0].cta}
            </Link>
          </div>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.08}>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {featuredSlides.map((slide) => (
            <Link
              key={slide.title}
              href={slide.href}
              className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium capitalize text-neutral-900 hover:bg-neutral-50"
            >
              {slide.title}
            </Link>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

export function CategoryHighlights() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((collection) => (
            <Link
              key={collection.slug}
              href={`/collections/${collection.slug}`}
              className="group rounded-md border border-neutral-200 bg-white p-3 transition hover:bg-neutral-50"
            >
              <p className="text-sm font-semibold text-neutral-900">{collection.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-700">
                {collection.description}
              </p>
              <p className="mt-2 text-xs font-semibold text-neutral-900 group-hover:underline">
                Explore
              </p>
            </Link>
          ))}
        </div>
      </ScrollReveal>
    </section>
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
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;

  return (
    <motion.article
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, delay: revealDelay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/products/${product.slug}`} className="relative block shrink-0">
        <div
          className="h-60 bg-cover bg-center transition-transform duration-500 hover:scale-[1.03]"
          style={{ backgroundImage: `url(${product.image})` }}
        />
        {salePct ? (
          <span className="absolute left-2 top-2 rounded bg-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {salePct}% Off
          </span>
        ) : null}
      </Link>
      {/* Single column: mt-auto only on the button so it pins to the bottom when the row stretches */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
        <p className="text-xs text-neutral-500">
          {product.reviews > 0
            ? `${product.rating.toFixed(1)} ★ · ${product.reviews} reviews`
            : "New · no reviews yet"}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className={
            rail || clampTitle
              ? "block min-h-10 line-clamp-2 text-sm font-semibold leading-snug text-neutral-900"
              : "block text-sm font-semibold leading-snug text-neutral-900"
          }
        >
          {product.name}
        </Link>
        <div className="flex flex-wrap content-start items-baseline gap-x-2 gap-y-0.5 text-xs">
          {product.compareAtPrice ? (
            <>
              <span className="text-neutral-500 line-through">
                Regular price {formatPkr(product.compareAtPrice)}
              </span>
              <span className="font-semibold text-neutral-900">
                Sale price {formatPkr(product.price)}
              </span>
              <span className="text-emerald-700">
                Save {formatPkr(product.compareAtPrice - product.price)}
              </span>
            </>
          ) : (
            <span className="font-semibold text-neutral-900">{formatPkr(product.price)}</span>
          )}
        </div>
        {product.defaultVariantId ? (
          <p className="pt-1 text-xs text-neutral-500">Multiple sizes / colors on product page</p>
        ) : null}
        {showAddToCart ? (
          <div className="mt-auto pt-2">
            <AddToCartButton
              product={product}
              openDrawer
              className="w-full rounded-md py-2 text-xs"
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
 * ul uses px-4 → 2rem horizontal; gap-3 → 0.75rem
 */
const RAIL_COL =
  "w-[calc((100vw-2.75rem)/1.5)] max-w-[232px] shrink-0 sm:w-[200px] sm:max-w-none md:w-[220px]";
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
    "rail-scroll -mx-4 flex list-none items-stretch gap-1.5 overflow-x-auto scroll-px-4 scroll-smooth px-4 pb-2 pt-1 snap-x snap-mandatory sm:mx-0 sm:gap-2 sm:px-0 sm:scroll-px-0";

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
        <ScrollReveal className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
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
          <div className="hidden items-stretch gap-1.5 md:grid md:grid-cols-3 lg:grid-cols-4">
            {railItems.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                showAddToCart={showAddToCart}
                revealDelay={Math.min(idx * 0.08, 0.36)}
              />
            ))}
          </div>
        </ScrollReveal>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-neutral-900">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4 items-stretch">
          {items.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              showAddToCart={showAddToCart}
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
  return (
    <section className="border-t border-neutral-200 bg-white py-12 sm:py-16">
      <ScrollReveal className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 lg:px-8">
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
        <div>
          <p className="text-sm font-medium text-neutral-500">{whyShop.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {whyShop.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-700 sm:text-base">
            {whyShop.body}
          </p>
          <Link
            href={whyShop.ctaHref}
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold capitalize text-white"
          >
            {whyShop.ctaLabel}
          </Link>
          <p className="mt-6 text-sm text-neutral-600">{whyShop.reviewsLine}</p>
        </div>
      </ScrollReveal>
    </section>
  );
}

export { Footer } from "./site-footer";

export function BundleSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Bundle Deals</h2>
          <Link href="/bundles" className="text-sm font-semibold capitalize text-neutral-900">
            View all
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {bundles.map((bundle) => (
            <Link
              key={bundle.slug}
              href="/bundles"
              className="rounded-xl border border-neutral-200 bg-white p-5"
            >
              <p className="text-xs font-semibold capitalize tracking-wide text-neutral-500">
                {bundle.discountLabel}
              </p>
              <p className="mt-1 text-lg font-semibold">{bundle.name}</p>
              <p className="mt-2 text-sm text-neutral-600">{bundle.description}</p>
            </Link>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

