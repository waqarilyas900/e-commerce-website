"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";

/** Shared style for primary header nav labels (Shop + dynamic header menu items). */
export const primaryNavLinkClass =
  "whitespace-nowrap text-sm font-medium text-neutral-800 transition-colors duration-200 hover:text-neutral-950";

const menuEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Chevron({ open }: { open: boolean }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-neutral-700"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.28, ease: menuEase }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  );
}

function ArrowRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Hub only — child `/collections/[slug]` must not light up Shop / chevron. */
function isShopHubPath(pathname: string | null): boolean {
  return pathname === "/collections";
}

/** “Shop” label → `/collections`; chevron alone toggles the per-collection menu. */
export function ShopCollectionsMenu() {
  const links = useNavCollections();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const hubActive = isShopHubPath(pathname);
  const childCollectionActive = Boolean(
    pathname?.startsWith("/collections/") && pathname !== "/collections",
  );
  /** Shop label selected only on hub — never when a dropdown child is the current page. */
  const shopLabelActive = hubActive;
  /** Chevron “pressed” look only while open, and never as a route-selected stand-in for a child. */
  const chevronActive = open && !childCollectionActive;

  function clearCloseTimer() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 180);
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    const onCloseMega = () => setOpen(false);
    window.addEventListener("storefront:close-mega-menus", onCloseMega);
    return () => window.removeEventListener("storefront:close-mega-menus", onCloseMega);
  }, []);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <div
        className={`flex items-center gap-0.5 rounded-md transition-colors duration-200 ${
          shopLabelActive || chevronActive ? "bg-neutral-100" : ""
        }`}
      >
        <Link
          href="/collections"
          aria-current={hubActive ? "page" : undefined}
          className={`${primaryNavLinkClass} relative rounded-md px-1.5 py-1 ${
            shopLabelActive ? "font-semibold text-neutral-950" : ""
          }`}
          onClick={() => {
            clearCloseTimer();
            setOpen(false);
          }}
        >
          Shop
          <span
            aria-hidden
            className={`absolute inset-x-1.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-neutral-950 transition-transform duration-300 ease-out ${
              shopLabelActive ? "scale-x-100" : "scale-x-0"
            }`}
          />
        </Link>
        <button
          type="button"
          className={`inline-flex cursor-pointer items-center rounded-full p-1.5 transition-colors duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900/20 ${
            chevronActive || hubActive
              ? "bg-neutral-200/80 text-neutral-950"
              : "text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950"
          }`}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={menuId}
          aria-label={open ? "Close collections menu" : "Open collections menu"}
          title="Collections"
          onClick={() => setOpen((o) => !o)}
        >
          <Chevron open={open} />
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: menuEase }}
            className="absolute left-0 top-full z-50 pt-2"
          >
            {/* Hover bridge so the cursor can move into the panel without closing */}
            <div className="min-w-[272px] overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35),0_8px_20px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
              <div className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Collections
                </p>
              </div>

              <div className="max-h-[min(70dvh,380px)] overflow-y-auto overscroll-contain py-1.5">
                {links.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-neutral-500">No collections yet.</p>
                ) : (
                  links.map((l, i) => {
                    const itemActive = pathname === `/collections/${l.slug}`;
                    return (
                      <motion.div
                        key={l.slug}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(i * 0.02, 0.12),
                          ease: menuEase,
                        }}
                      >
                        <HoverPrefetchLink
                          href={`/collections/${l.slug}`}
                          role="menuitem"
                          aria-current={itemActive ? "page" : undefined}
                          className={`group relative mx-1.5 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15 ${
                            itemActive
                              ? "bg-neutral-100 pl-3.5 font-semibold text-neutral-950"
                              : "text-neutral-800 hover:bg-neutral-100 hover:pl-3.5 hover:text-neutral-950 focus-visible:bg-neutral-100"
                          }`}
                          onClick={() => {
                            clearCloseTimer();
                            setOpen(false);
                          }}
                        >
                          <span
                            aria-hidden
                            className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-neutral-950 transition-opacity duration-200 ${
                              itemActive
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                            }`}
                          />
                          <span className="min-w-0 truncate">{l.name}</span>
                          <span
                            className={`translate-x-0 transition-all duration-200 ${
                              itemActive
                                ? "translate-x-0.5 text-neutral-700 opacity-100"
                                : "text-neutral-400 opacity-0 group-hover:translate-x-0.5 group-hover:text-neutral-700 group-hover:opacity-100 group-focus-visible:opacity-100"
                            }`}
                          >
                            <ArrowRight />
                          </span>
                        </HoverPrefetchLink>
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-neutral-100 bg-neutral-50/60 p-1.5">
                <Link
                  href="/collections"
                  role="menuitem"
                  aria-current={pathname === "/collections" ? "page" : undefined}
                  className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                    pathname === "/collections"
                      ? "bg-white text-neutral-950 ring-1 ring-neutral-200"
                      : "text-neutral-950 hover:bg-white"
                  }`}
                  onClick={() => {
                    clearCloseTimer();
                    setOpen(false);
                  }}
                >
                  View all collections
                  <span className="text-neutral-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-900">
                    <ArrowRight />
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
