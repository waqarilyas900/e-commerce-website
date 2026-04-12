"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/app/providers/cart-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { HeaderAccount } from "@/components/auth/HeaderAccount";
import { HeaderSearchPopover } from "@/components/HeaderSearchPopover";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import {
  primaryNavLinkClass,
  ShopCollectionsMenu,
  ShopCollectionsMobileList,
} from "@/components/navigation/shop-collections-menu";
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
      <span className="block max-w-full truncate px-1">{announcement}</span>
    </div>
  );
}

export function Header() {
  const { storeName } = useStoreBrand();
  const { openCart, itemCount } = useCart();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <div
          id="HeaderWrapper"
          className="header-wrapper mx-auto grid min-h-[64px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:min-h-[72px] sm:px-6 md:min-h-[83px] lg:px-8"
        >
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
            <span className="hidden min-w-0 max-h-[3rem] truncate text-center text-sm font-semibold uppercase leading-tight tracking-wide text-neutral-900 sm:inline md:text-base">
              {storeName}
            </span>
          </Link>
          <div className="flex min-h-0 items-center justify-end gap-0.5 text-neutral-800 sm:gap-2 lg:gap-3">
            <HeaderAccount />
            <HeaderSearchPopover open={searchOpen} onOpenChange={setSearchOpen} />
            <button
              type="button"
              onClick={() => openCart()}
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2.5 lg:gap-2"
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
              <span className="hidden text-xs font-medium lg:inline">Cart</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileNavOpen ? (
          <motion.div
            className="fixed inset-0 z-30 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              aria-label="Close menu"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <motion.nav
              className="absolute left-0 top-0 flex h-full w-[min(88vw,300px)] flex-col gap-4 bg-white p-6 shadow-xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 35 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Site navigation
              </p>
              <ShopCollectionsMobileList onNavigate={() => setIsMobileNavOpen(false)} />
              <Link
                href="/collections/sale"
                className="text-[15px] font-semibold tracking-tight text-neutral-950"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <span aria-hidden className="mr-1">⚡</span>
                Sale
              </Link>
              <Link
                href="/bundles"
                className="text-[15px] font-semibold tracking-tight text-neutral-950"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <span aria-hidden className="mr-1">🔥</span>
                Bundle Deals
              </Link>
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setSearchOpen(true);
                }}
              >
                Search
              </button>
              <Link href="/contact" onClick={() => setIsMobileNavOpen(false)}>
                Contact
              </Link>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CartDrawer />
    </>
  );
}

export function Hero() {
  const featuredSlides = promoSlides.slice(0, 5);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div
        className="relative min-h-[430px] overflow-hidden rounded-xl bg-cover bg-center"
        style={{ backgroundImage: `url(${featuredSlides[0].image})` }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex min-h-[430px] flex-col justify-end p-7 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Brand New</p>
          <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">
            {featuredSlides[0].title}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">
            {featuredSlides[0].subtitle}
          </p>
          <Link
            href={featuredSlides[0].href}
            className="mt-5 w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            {featuredSlides[0].cta}
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {featuredSlides.map((slide) => (
          <Link
            key={slide.title}
            href={slide.href}
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            {slide.title}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CategoryHighlights() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
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
    </section>
  );
}

export function ProductCard({
  product,
  showAddToCart = true,
}: {
  product: Product;
  /** Set false on the home page to hide quick-add (use PDP or other pages to purchase). */
  showAddToCart?: boolean;
}) {
  if (!product?.slug) {
    return null;
  }

  const salePct =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;

  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
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
        <p className="text-[11px] text-neutral-500">
          {product.reviews > 0
            ? `${product.rating.toFixed(1)} ★ · ${product.reviews} reviews`
            : "New · no reviews yet"}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="block text-sm font-semibold leading-snug text-neutral-900"
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
          <p className="pt-1 text-[10px] text-neutral-500">Multiple sizes / colors on product page</p>
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
    </article>
  );
}

export function ProductSection({
  title,
  items,
  viewAllHref = "/collections",
  showAddToCart = true,
}: {
  title: string;
  items: Product[];
  viewAllHref?: string;
  showAddToCart?: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-neutral-900">
          View all
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} showAddToCart={showAddToCart} />
        ))}
      </div>
    </section>
  );
}

export function WhyShop() {
  const { whyShop } = useStoreBrand();
  return (
    <section className="border-t border-neutral-200 bg-white py-12 sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 lg:px-8">
        <Link
          href={whyShop.ctaHref}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-100 md:aspect-square"
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
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            {whyShop.ctaLabel}
          </Link>
          <p className="mt-6 text-sm text-neutral-600">{whyShop.reviewsLine}</p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { storeName, footer } = useStoreBrand();
  const mailto = `mailto:${footer.supportEmail}`;

  return (
    <div id="shopify-section-footer" className="shopify-section shopify-section-footer">
      <footer
        className="site-footer border-t border-white/10 bg-[var(--colorFooter)] text-[var(--colorFooterText)]"
        data-section-id="sections--footer"
        data-section-type="footer"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-14 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
            <div className="footer-block footer-block--text">
              <h2 className="footer__title text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--colorFooterText)]">
                Need help?
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-white/85">
                Reach us at
              </p>
              <a
                href={mailto}
                className="mt-1 inline-block text-[15px] font-medium uppercase tracking-wide text-[var(--colorFooterText)] underline-offset-4 hover:underline"
              >
                {footer.supportEmail}
              </a>
              <p className="mt-5 text-[15px] leading-relaxed text-white/85">
                Call/Whatsapp :{" "}
                <span className="font-medium text-[var(--colorFooterText)]">{footer.phone}</span>
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/75">
                {footer.hoursLine}
              </p>
            </div>

            <div className="footer-block footer-block--link_list">
              <h2 className="footer__title flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--colorFooterText)]">
                <span>Explore</span>
                <span className="text-base leading-none" aria-hidden>
                  ⚡
                </span>
              </h2>
              <ul className="footer__linklist mt-5 grid list-none gap-2.5 pl-0 text-[15px] text-white/90 sm:grid-cols-2 sm:gap-x-10">
                {footer.exploreLinks.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-white hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Policies
            </p>
            <ul className="mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 pl-0 text-xs text-white/70">
              <li>
                <Link
                  href="/policies/returns"
                  className="transition-colors hover:text-white hover:underline"
                >
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/shipping"
                  className="transition-colors hover:text-white hover:underline"
                >
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/terms"
                  className="transition-colors hover:text-white hover:underline"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/privacy"
                  className="transition-colors hover:text-white hover:underline"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 pt-8 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/dummy-logo.svg"
                alt=""
                width={34}
                height={34}
                className="brightness-0 invert opacity-90"
              />
              <span className="text-sm font-semibold uppercase tracking-[0.12em] text-white/95">
                {storeName}
              </span>
            </div>
            <p className="text-xs text-white/55">Instagram · Facebook</p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/40">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-white/50 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} {storeName} · All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}

export function BundleSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Bundle Deals</h2>
        <Link href="/bundles" className="text-sm font-semibold text-neutral-900">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {bundle.discountLabel}
            </p>
            <p className="mt-1 text-lg font-semibold">{bundle.name}</p>
            <p className="mt-2 text-sm text-neutral-600">{bundle.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

