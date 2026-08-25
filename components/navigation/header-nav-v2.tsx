"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HeaderAccount, HeaderAccountV2 } from "@/components/auth/HeaderAccount";
import { HeaderSearchBar } from "@/components/navigation/header-search-bar";
import { HeaderMobileSearch } from "@/components/navigation/header-mobile-search";
import { AllCategoriesMegaMenu } from "@/components/navigation/all-categories-mega-menu";
import { MobileNavDrawer } from "@/components/navigation/mobile-nav-drawer";
import { SiteLogoMark } from "@/components/site-logo";
import { SaleBoltIcon } from "@/components/icons/sale-bolt-icon";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { useCart } from "@/app/providers/cart-provider";
import { formatPkr } from "@/app/lib/format-currency";
import { NAV2_ACCENT } from "@/components/navigation/nav2-theme";

const STRIP_VISIBLE = 5;
const MORE_PANEL_MIN_W = 200;
const menuEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const CLOSE_MENUS = "storefront:close-mega-menus";

const stripHover =
  "inline-flex shrink-0 items-center whitespace-nowrap px-3 py-[7px] text-[13px] font-medium text-neutral-800 transition-colors hover:text-[#E0703A]";

function dispatchCloseMenus() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLOSE_MENUS));
}

function MoreCategoriesMenu({
  items,
}: {
  items: { slug: string; name: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  useEffect(() => setMounted(true), []);

  function clearCloseTimer() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function measure() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelW = Math.max(MORE_PANEL_MIN_W, panelRef.current?.offsetWidth ?? MORE_PANEL_MIN_W);
    let left = r.right - panelW;
    left = Math.min(left, window.innerWidth - panelW - 8);
    left = Math.max(8, left);
    setPos({ top: r.bottom + 4, left });
  }

  function openMenu() {
    clearCloseTimer();
    dispatchCloseMenus();
    measure();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 180);
  }

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    requestAnimationFrame(measure);
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    const onClose = () => setOpen(false);
    window.addEventListener(CLOSE_MENUS, onClose);
    return () => window.removeEventListener(CLOSE_MENUS, onClose);
  }, []);

  useEffect(() => () => clearCloseTimer(), []);

  if (items.length === 0) return null;

  const panel =
    mounted
      ? createPortal(
          <AnimatePresence>
            {open && pos ? (
              <motion.div
                key="nav2-more"
                ref={panelRef}
                id={menuId}
                role="menu"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.14, ease: menuEase }}
                className="fixed z-[200] min-w-[200px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
                style={{ top: pos.top, left: pos.left }}
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
              >
                {items.map((item) => (
                  <HoverPrefetchLink
                    key={item.slug}
                    href={item.href}
                    role="menuitem"
                    className="block px-3.5 py-2 text-[13px] font-medium text-neutral-800 transition-colors hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A]"
                    onClick={() => {
                      clearCloseTimer();
                      setOpen(false);
                    }}
                  >
                    {item.name}
                  </HoverPrefetchLink>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex items-center gap-0.5 px-2.5 py-[7px] text-[13px] font-medium transition-colors ${
          open ? "text-[#E0703A]" : "text-neutral-800 hover:text-[#E0703A]"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => {
          clearCloseTimer();
          if (open) setOpen(false);
          else openMenu();
        }}
      >
        More
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {panel}
    </div>
  );
}

function LocaleCurrencyChip() {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearClose() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  useEffect(() => () => clearClose(), []);

  return (
    <div
      className="relative hidden lg:block"
      onMouseEnter={() => {
        clearClose();
        setOpen(true);
      }}
      onMouseLeave={() => {
        clearClose();
        closeTimerRef.current = setTimeout(() => setOpen(false), 160);
      }}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
        aria-expanded={open}
        aria-haspopup="true"
        title="Ship to Pakistan · English · PKR"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-[10px] leading-none">
          🇵🇰
        </span>
        <span className="leading-tight">
          <span className="text-neutral-500">EN/</span>
          <span className="text-neutral-900">PKR</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.14, ease: menuEase }}
            className="absolute right-0 top-[calc(100%+6px)] z-[180] w-[220px] overflow-hidden rounded-lg border border-neutral-200 bg-white p-3 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Shopping preferences
            </p>
            <ul className="mt-2 space-y-2 text-[13px] text-neutral-800">
              <li className="flex items-center justify-between gap-2">
                <span className="text-neutral-500">Ship to</span>
                <span className="font-medium">Pakistan</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-neutral-500">Language</span>
                <span className="font-medium">English</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-neutral-500">Currency</span>
                <span className="font-medium">PKR</span>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CartHoverButton() {
  const { openCart, itemCount, resolvedLines, subtotal } = useCart();
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preview = resolvedLines.slice(0, 3);

  function clearClose() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  useEffect(() => () => clearClose(), []);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        clearClose();
        setOpen(true);
      }}
      onMouseLeave={() => {
        clearClose();
        closeTimerRef.current = setTimeout(() => setOpen(false), 180);
      }}
    >
      <button
        type="button"
        onClick={() => openCart()}
        className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-neutral-800 transition-colors hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2"
        aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
        aria-expanded={open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-6 w-6 shrink-0"
          aria-hidden
        >
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
          <path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 7H7.2" />
        </svg>
        <span
          className="absolute -right-0.5 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
          style={{ backgroundColor: NAV2_ACCENT }}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
        <span className="hidden flex-col leading-tight lg:inline">
          <span className="text-[12px] font-medium">Cart</span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.14, ease: menuEase }}
            className="absolute right-0 top-[calc(100%+8px)] z-[180] hidden w-[300px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)] lg:block"
          >
            {itemCount === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] font-medium text-neutral-800">Your cart is empty</p>
                <p className="mt-1 text-[12px] text-neutral-500">Add items to get started</p>
                <Link
                  href="/collections"
                  className="btn mt-4 inline-flex rounded-none text-white"
                  style={{ backgroundColor: NAV2_ACCENT }}
                  onClick={() => setOpen(false)}
                >
                  Start shopping
                </Link>
              </div>
            ) : (
              <div className="p-3">
                <p className="mb-2 text-[12px] font-semibold text-neutral-900">
                  Cart · {itemCount} item{itemCount === 1 ? "" : "s"}
                </p>
                <ul className="space-y-2">
                  {preview.map(({ line, product, unitPrice }) => (
                    <li key={line.variantId} className="flex gap-2.5">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-50">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[12px] leading-snug text-neutral-800">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block text-[12px] font-semibold text-neutral-900">
                          {formatPkr(unitPrice)} · ×{line.quantity}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {itemCount > preview.length ? (
                  <p className="mt-2 text-[11px] text-neutral-500">
                    +{itemCount - preview.length} more in cart
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                  <span className="text-[12px] text-neutral-500">Subtotal</span>
                  <span className="text-[13px] font-semibold text-neutral-900">
                    {formatPkr(subtotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openCart();
                  }}
                  className="btn mt-2.5 w-full rounded-none text-white"
                  style={{ backgroundColor: NAV2_ACCENT }}
                >
                  View cart
                </button>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * AliExpress-inspired header (brand accent orange):
 * row 1 — logo | AE-style search | EN/PKR + Account hover + Cart preview
 * row 2 — All Categories mega + collection links + More (viewport-safe)
 */
export function HeaderNavV2() {
  const pathname = usePathname();
  const { storeName } = useStoreBrand();
  const headerNavItems = useHeaderNavMenuItems();
  const collections = useNavCollections();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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

  const headerSlugs = new Set(headerNavItems.map((h) => h.slug));
  const stripCollections = collections.filter((c) => !headerSlugs.has(c.slug));
  const visibleCollections = stripCollections.slice(0, STRIP_VISIBLE);
  const moreCollections = stripCollections.slice(STRIP_VISIBLE).map((c) => ({
    slug: c.slug,
    name: c.name,
    href: `/collections/${c.slug}`,
  }));

  const headerContent = (isStickyHeader: boolean) => (
    <div className="header-wrapper mx-auto max-w-7xl shell-x">
      <div className="flex items-center gap-3 py-2.5 sm:gap-4 md:gap-5 md:py-3">
        <button
          type="button"
          className={`flex shrink-0 items-center rounded-md p-1.5 text-neutral-800 transition-colors lg:hidden ${
            isMobileNavOpen ? "bg-neutral-100" : "hover:bg-neutral-50"
          }`}
          aria-label="Site navigation"
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen((o) => !o)}
        >
          <span className="text-xl leading-none">☰</span>
        </button>

        <Link
          href="/"
          className="relative z-10 flex shrink-0 items-center"
          aria-label={`${storeName} home`}
        >
          <SiteLogoMark />
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">
          {isStickyHeader ? (stickyActive ? <HeaderSearchBar /> : null) : !stickyActive ? (
            <HeaderSearchBar />
          ) : (
            <div className="h-9" aria-hidden />
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 text-neutral-800 sm:gap-1 lg:gap-1.5">
          <div className="md:hidden">
            <HeaderMobileSearch
              onOpenChange={(next) => {
                if (next) setIsMobileNavOpen(false);
              }}
            />
          </div>

          <LocaleCurrencyChip />
          <HeaderAccountV2 />
          <HeaderAccount />
          <CartHoverButton />
        </div>
      </div>

      {/* Category strip stays with the header when sticky */}
      <div className="hidden border-t border-neutral-100/80 lg:block">
        <div className="flex items-center gap-1 py-1.5">
          <AllCategoriesMegaMenu />
          <nav
            className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Department links"
          >
            {headerNavItems.map((item) => {
              const isSale = item.slug === "sale" || /sale|deal/i.test(item.label);
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <HoverPrefetchLink
                  key={item.id}
                  href={item.href}
                  prefetch
                  className={
                    isSale || active
                      ? "inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-3 py-[7px] text-[13px] font-semibold transition-colors hover:opacity-90"
                      : stripHover
                  }
                  style={isSale || active ? { color: NAV2_ACCENT } : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {isSale ? (
                    <SaleBoltIcon className="h-[14px] w-[14px] shrink-0" aria-hidden />
                  ) : null}
                  {item.label}
                </HoverPrefetchLink>
              );
            })}
            {visibleCollections.map((c) => {
              const href = `/collections/${c.slug}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <HoverPrefetchLink
                  key={c.slug}
                  href={href}
                  prefetch
                  className={
                    active
                      ? "inline-flex shrink-0 items-center whitespace-nowrap px-3 py-[7px] text-[13px] font-semibold"
                      : stripHover
                  }
                  style={active ? { color: NAV2_ACCENT } : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {c.name}
                </HoverPrefetchLink>
              );
            })}
          </nav>
          <MoreCategoriesMenu items={moreCollections} />
        </div>
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
