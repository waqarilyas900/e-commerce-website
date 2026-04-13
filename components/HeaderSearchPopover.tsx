"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { collections } from "@/app/lib/store-data";

/** Aligns with `TopStrip` (37px) + `Header` min-heights in storefront */
const HEADER_TOP_OFFSET =
  "top-[101px] sm:top-[109px] md:top-[120px]";

/** Nike-style: strong dim on page content only (not the header strip), no blur */
const SEARCH_SCRIM_CLASS =
  `fixed inset-x-0 bottom-0 z-[35] ${HEADER_TOP_OFFSET} bg-[rgba(0,0,0,0.62)]`;

function popularSearchTerms(): string[] {
  const fromCollections = collections.map((c) => c.name);
  const extra = ["Sale", "Bundle deals", "New arrivals"];
  const merged = [...fromCollections, ...extra];
  return [...new Set(merged)].slice(0, 14);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HeaderSearchPopover({ open, onOpenChange }: Props) {
  const { storeName } = useStoreBrand();
  const router = useRouter();
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const terms = popularSearchTerms();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

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
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-2.5 lg:gap-2"
        aria-expanded={open}
        aria-controls={panelId}
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
        <span className="hidden text-xs font-medium lg:inline">Search</span>
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close search"
              className={SEARCH_SCRIM_CLASS}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className={`fixed inset-x-0 z-[40] ${HEADER_TOP_OFFSET} max-h-[min(85vh,560px)] overflow-y-auto border-b border-neutral-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
