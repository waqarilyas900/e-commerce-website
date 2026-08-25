"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import type { NavCollectionLink } from "@/app/lib/nav-collections";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { NAV2_ACCENT } from "@/components/navigation/nav2-theme";

const menuEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function CategoryGlyph({ slug }: { slug: string }) {
  const s = slug.toLowerCase();
  const cls = "h-[18px] w-[18px]";
  const stroke = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (s.includes("drink") || s.includes("tumbler") || s.includes("bottle")) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
        <path d="M8 3h8l-1 3v12a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V6L8 3z" />
        <path d="M9 8h6" />
      </svg>
    );
  }
  if (s.includes("kitchen") || s.includes("cook")) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
        <path d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9z" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (s.includes("appliance") || s.includes("heater") || s.includes("kettle")) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (s.includes("beauty") || s.includes("personal") || s.includes("care")) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
        <path d="M12 3v4M9 7h6l1 13H8L9 7z" />
        <path d="M10 11h4" />
      </svg>
    );
  }
  if (s.includes("lamp") || s.includes("light")) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a5 5 0 0 1 5 5c0 2.5-1.5 3.5-2.5 5H9.5C8.5 11.5 7 10.5 7 8a5 5 0 0 1 5-5z" />
      </svg>
    );
  }
  if (s.includes("pest") || s.includes("mosquito")) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
        <circle cx="12" cy="12" r="3" />
        <path d="M5 8l4 3M19 8l-4 3M5 16l4-3M19 16l-4-3M12 5v2M12 17v2" />
      </svg>
    );
  }
  if (s.includes("wellness") || s.includes("comfort") || s.includes("massage")) {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
        <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden {...stroke}>
      <path d="M4 7h16v12H4z" />
      <path d="M4 7l2-3h12l2 3" />
      <path d="M10 11h4" />
    </svg>
  );
}

function Thumb({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) return <div className={`bg-neutral-100 ${className ?? ""}`} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />
  );
}

/**
 * AliExpress-style “All Categories” — hamburger pill + wide mega panel.
 * No chevron on the trigger (matches AE). Left rail keeps › affordance only.
 */
export function AllCategoriesMegaMenu() {
  const links = useNavCollections();
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  const active: NavCollectionLink | undefined =
    links.find((l) => l.slug === activeSlug) ?? links[0];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!activeSlug && links[0]?.slug) setActiveSlug(links[0].slug);
  }, [links, activeSlug]);

  function clearCloseTimer() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function measure() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }

  function openMenu() {
    clearCloseTimer();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storefront:close-mega-menus"));
    }
    measure();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 200);
  }

  useLayoutEffect(() => {
    if (!open) return;
    measure();
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
    const onCloseMega = () => setOpen(false);
    window.addEventListener("storefront:close-mega-menus", onCloseMega);
    return () => window.removeEventListener("storefront:close-mega-menus", onCloseMega);
  }, []);

  useEffect(() => () => clearCloseTimer(), []);

  const recommended = active?.products?.slice(0, 8) ?? [];

  const panel =
    mounted
      ? createPortal(
          <AnimatePresence>
            {open && pos ? (
              <motion.div
                key="nav2-mega"
                ref={panelRef}
                id={menuId}
                role="menu"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.15, ease: menuEase }}
                className="fixed z-[200]"
                style={{ top: pos.top, left: pos.left }}
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
              >
                <div className="flex overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.14)]">
                  <div className="w-[232px] shrink-0 border-r border-neutral-100 py-1.5">
                    <div className="max-h-[min(70dvh,440px)] overflow-y-auto overscroll-contain">
                      {links.map((l) => {
                        const isActive = active?.slug === l.slug;
                        return (
                          <HoverPrefetchLink
                            key={l.slug}
                            href={`/collections/${l.slug}`}
                            role="menuitem"
                          className={`flex w-full items-center gap-2.5 px-3.5 py-[9px] text-left text-[13px] transition-colors ${
                            isActive
                              ? "bg-[rgba(224,112,58,0.1)] font-medium text-[#E0703A]"
                              : "font-normal text-neutral-800 hover:bg-[rgba(224,112,58,0.06)] hover:text-[#E0703A]"
                          }`}
                            onMouseEnter={() => setActiveSlug(l.slug)}
                            onFocus={() => setActiveSlug(l.slug)}
                            onClick={() => {
                              clearCloseTimer();
                              setOpen(false);
                            }}
                          >
                            {l.imageUrl ? (
                              <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-neutral-50">
                                <Thumb
                                  src={l.imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </span>
                            ) : (
                              <span className="shrink-0 text-neutral-500">
                                <CategoryGlyph slug={l.slug} />
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate">{l.name}</span>
                            <span className="shrink-0 text-[11px] text-neutral-400" aria-hidden>
                              ›
                            </span>
                          </HoverPrefetchLink>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-[min(560px,calc(100vw-280px))] min-w-[380px] p-4">
                    {active ? (
                      <>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                          <h3 className="text-[13px] font-semibold text-neutral-900">
                            Recommended in {active.name}
                          </h3>
                          <Link
                            href={`/collections/${active.slug}`}
                            className="text-[12px] font-semibold hover:underline"
                            style={{ color: NAV2_ACCENT }}
                            onClick={() => {
                              clearCloseTimer();
                              setOpen(false);
                            }}
                          >
                            View all ›
                          </Link>
                        </div>

                        {recommended.length > 0 ? (
                          <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                            {recommended.map((p) => (
                              <HoverPrefetchLink
                                key={p.slug}
                                href={p.href}
                                className="group flex flex-col gap-1.5"
                                onClick={() => {
                                  clearCloseTimer();
                                  setOpen(false);
                                }}
                              >
                                <span className="relative aspect-square overflow-hidden rounded-md bg-neutral-50 ring-1 ring-neutral-100">
                                  <Thumb
                                    src={p.image}
                                    alt=""
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                                  />
                                </span>
                                <span className="line-clamp-2 text-[11px] leading-snug text-neutral-700 transition-colors group-hover:text-[#E0703A]">
                                  {p.name}
                                </span>
                              </HoverPrefetchLink>
                            ))}
                          </div>
                        ) : (
                          <Link
                            href={`/collections/${active.slug}`}
                            className="inline-flex items-center gap-3 rounded-lg bg-neutral-50 p-3 hover:bg-neutral-100"
                            onClick={() => {
                              clearCloseTimer();
                              setOpen(false);
                            }}
                          >
                            {active.imageUrl ? (
                              <Thumb
                                src={active.imageUrl}
                                alt=""
                                className="h-14 w-14 rounded-md object-cover"
                              />
                            ) : null}
                            <span className="text-sm font-medium text-neutral-900">
                              Shop {active.name}
                            </span>
                          </Link>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
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
        className={`inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-neutral-900 transition-colors ${
          open ? "bg-neutral-200" : "bg-[#f5f5f5] hover:bg-neutral-200/90"
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
        <svg
          viewBox="0 0 24 24"
          className="h-[15px] w-[15px] shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          aria-hidden
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
        All Categories
      </button>
      {panel}
    </div>
  );
}
