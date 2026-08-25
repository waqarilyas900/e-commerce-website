"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HeaderAccount } from "@/components/auth/HeaderAccount";
import { HeaderSearchPopover } from "@/components/HeaderSearchPopover";
import { MobileNavDrawer } from "@/components/navigation/mobile-nav-drawer";
import { ShopCollectionsMenu } from "@/components/navigation/shop-collections-menu";
import { SiteLogoMark } from "@/components/site-logo";
import { SaleBoltIcon } from "@/components/icons/sale-bolt-icon";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { useCart } from "@/app/providers/cart-provider";
import { isEffectivelyEmptyHtml } from "@/app/lib/html-content";

const primaryNavLinkClass =
  "text-[13px] font-medium tracking-wide text-neutral-700 transition-colors";

const SEARCH_PANEL_TOP_WITH_STRIP =
  "top-[101px] sm:top-[109px] md:top-[120px]";
const SEARCH_PANEL_TOP_HEADER_ONLY =
  "top-[64px] sm:top-[72px] md:top-[83px]";

/** Classic storefront header — centered logo, nav left, actions right. */
export function HeaderNavV1() {
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
    <div className="header-wrapper relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 py-1.5 shell-x sm:gap-x-4 sm:py-2 md:py-2">
      <div className="flex min-h-0 min-w-0 items-center justify-start gap-3">
        <button
          type="button"
          className={`flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors lg:hidden ${
            isMobileNavOpen
              ? "bg-neutral-100 text-neutral-950"
              : "text-neutral-800 hover:bg-neutral-50"
          }`}
          aria-label="Site navigation"
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen((o) => !o)}
        >
          <span className="text-xl leading-none">☰</span>
        </button>
        <nav
          className="relative z-10 hidden min-h-0 min-w-0 flex-nowrap items-center gap-3 lg:flex xl:gap-4"
          aria-label="Primary"
        >
          <ShopCollectionsMenu />
          {headerNavItems.map((item) => (
            <HoverPrefetchLink
              key={item.id}
              href={item.href}
              prefetch
              className={`${primaryNavLinkClass} inline-flex shrink-0 items-center gap-1 rounded-md px-0.5 py-1 hover:text-neutral-950`}
            >
              {item.slug === "sale" ? (
                <SaleBoltIcon className="h-[15px] w-[15px] shrink-0" aria-hidden />
              ) : null}
              {item.label}
            </HoverPrefetchLink>
          ))}
        </nav>
      </div>

      <Link
        href="/"
        className="relative z-10 flex shrink-0 items-center justify-center justify-self-center px-1"
        aria-label={`${storeName} home`}
      >
        <SiteLogoMark />
      </Link>

      <div className="relative z-10 flex min-h-0 min-w-0 items-center justify-end gap-0 text-neutral-800 sm:gap-1.5 lg:gap-3">
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
          className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-2 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2.5 lg:gap-2"
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
    </>
  );
}
