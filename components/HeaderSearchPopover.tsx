"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, type FormEvent } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import type { NavCollectionLink } from "@/app/lib/nav-collections";

/** Aligns with `TopStrip` (37px) + `Header` min-heights in storefront */
const HEADER_TOP_OFFSET =
  "top-[101px] sm:top-[109px] md:top-[120px]";

function popularSearchTerms(links: NavCollectionLink[]): string[] {
  const fromCollections = links.map((c) => c.name);
  const merged = [...fromCollections, "Sale"];
  return [...new Set(merged)].slice(0, 14);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Render only trigger button when false (no panel/effects). */
  renderPanel?: boolean;
  /** Optional top offset utility classes for panel/scrim positioning. */
  panelOffsetClass?: string;
};

/** Match `components/cart/CartDrawer.tsx` for open/close rhythm */
const easeSilk: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeSoftIn: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Slow, smooth open */
const panelEnterTransition = {
  duration: 0.68,
  ease: [0.25, 1, 0.5, 1] as const,
};

/** Panel fully leaves like cart drawer slide (cart uses `x` 0.42s + easeSoftIn) */
const panelExitTransition = {
  duration: 0.42,
  ease: easeSoftIn,
};

/** Same duration as panel exit so both finish together (avoids staggered “pop” before onExitComplete) */
const scrimExitTransition = {
  duration: 0.42,
  ease: easeSilk,
};

const scrimEnterTransition = {
  duration: 0.45,
  ease: easeSilk,
};

export function HeaderSearchPopover({
  open,
  onOpenChange,
  renderPanel = true,
  panelOffsetClass = HEADER_TOP_OFFSET,
}: Props) {
  const { storeName } = useStoreBrand();
  const navLinks = useNavCollections();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** Scroll lock on `html` (matches `scrollbar-gutter` in globals); body padding only when scrollbar consumes width */
  const htmlOverflowSnapshotRef = useRef<string | null>(null);
  const bodyPaddingRightSnapshotRef = useRef<string | null>(null);
  const scrollLockedRef = useRef(false);
  /** Latest `open` for exit callback — avoid unlocking if user re-opened before exit finished. */
  const openRef = useRef(open);
  openRef.current = open;
  const terms = popularSearchTerms(navLinks);

  useEffect(() => {
    if (!open || !renderPanel) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, renderPanel]);

  useEffect(() => {
    if (!open || !renderPanel) return;
    if (!scrollLockedRef.current) {
      const html = document.documentElement;
      const body = document.body;
      /** Measure while scrollbar still affects layout; avoids width jump when hiding overflow */
      const scrollbarWidth = window.innerWidth - html.clientWidth;
      bodyPaddingRightSnapshotRef.current = body.style.paddingRight;
      htmlOverflowSnapshotRef.current = html.style.overflow;
      html.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
      scrollLockedRef.current = true;
    }
  }, [open, renderPanel]);

  const releaseBodyScrollLock = () => {
    if (!scrollLockedRef.current) return;
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = htmlOverflowSnapshotRef.current ?? "";
    body.style.paddingRight = bodyPaddingRightSnapshotRef.current ?? "";
    htmlOverflowSnapshotRef.current = null;
    bodyPaddingRightSnapshotRef.current = null;
    scrollLockedRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (scrollLockedRef.current) {
        const h = document.documentElement;
        const b = document.body;
        h.style.overflow = htmlOverflowSnapshotRef.current ?? "";
        b.style.paddingRight = bodyPaddingRightSnapshotRef.current ?? "";
        scrollLockedRef.current = false;
        htmlOverflowSnapshotRef.current = null;
        bodyPaddingRightSnapshotRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !renderPanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, renderPanel]);

  useEffect(() => {
    if (!open || !renderPanel) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onOpenChange(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open, onOpenChange, renderPanel]);

  const goSearch = (q: string) => {
    const query = q.trim();
    if (!query) return;
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") ?? "");
    goSearch(q);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Search"
        className="cursor-pointer inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2.5 lg:gap-2"
        aria-expanded={open}
        aria-controls={renderPanel ? panelId : undefined}
        onClick={() => onOpenChange(!open)}
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
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only">Search</span>
      </button>

      <AnimatePresence
        onExitComplete={() => {
          if (openRef.current) return;
          /** Two frames after exit: lets compositor finish without ~50ms setTimeout delay */
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!openRef.current) releaseBodyScrollLock();
            });
          });
        }}
      >
        {open && renderPanel ? (
          <>
            <motion.button
              type="button"
              aria-label="Close search"
              className={`fixed inset-x-0 bottom-0 z-90 ${panelOffsetClass} bg-[rgba(0,0,0,0.62)]`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: reduceMotion
                  ? { duration: 0.14, ease: "easeOut" }
                  : scrimExitTransition,
              }}
              transition={
                reduceMotion
                  ? { duration: 0.22, ease: "easeOut" }
                  : scrimEnterTransition
              }
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              style={{ transformOrigin: "top center" }}
              className={`fixed inset-x-0 z-100 ${panelOffsetClass} max-h-[min(85dvh,560px)] overflow-y-auto overflow-x-hidden border-b border-neutral-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]`}
              initial={
                reduceMotion ? { opacity: 0 } : { y: "-100%", opacity: 1 }
              }
              animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={
                reduceMotion
                  ? {
                      opacity: 0,
                      transition: { duration: 0.14, ease: "easeOut" },
                    }
                  : {
                      y: "-100%",
                      opacity: 0,
                      transition: panelExitTransition,
                    }
              }
              transition={
                reduceMotion ? { duration: 0.22 } : panelEnterTransition
              }
            >
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="relative">
                  <label htmlFor={`${panelId}-q`} className="sr-only">
                    Search products
                  </label>
                  <div className="flex items-center gap-3 rounded-full border border-neutral-900/15 bg-[#f5f5f5] px-4 py-3 focus-within:border-neutral-900 focus-within:bg-white focus-within:ring-1 focus-within:ring-neutral-900/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5 shrink-0 text-neutral-500"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                      ref={inputRef}
                      id={`${panelId}-q`}
                      name="q"
                      type="search"
                      autoComplete="off"
                      placeholder="Search products…"
                      className="min-w-0 flex-1 bg-transparent text-base text-neutral-900 placeholder:text-neutral-500 outline-none"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Search
                    </button>
                  </div>
                </form>

                <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-5">
                  <Link
                    href="/contact"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    <span className="text-base leading-none" aria-hidden>
                      ✦
                    </span>
                    Ask {storeName} AI
                  </Link>
                </div>

                <section
                  aria-label="Popular Search Terms"
                  className="pt-5"
                  data-testid="visual-search-results-container"
                >
                  <h2 className="text-xs font-semibold capitalize tracking-[0.12em] text-neutral-500">
                    Popular Search Terms
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {terms.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="rounded-full bg-[#f5f5f5] px-3 py-2 text-sm text-neutral-900 transition hover:bg-[#ebebeb]"
                        onClick={() => goSearch(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
