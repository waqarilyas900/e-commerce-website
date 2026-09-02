"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { formatPkr } from "@/app/lib/format-currency";
import { NAV2_ACCENT } from "@/components/navigation/nav2-theme";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

type SuggestProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  collection: string;
};

type SuggestCategory = {
  slug: string;
  name: string;
  href: string;
};

const easeSilk: [number, number, number, number] = [0.22, 1, 0.36, 1];
const CLOSE_MENUS = "storefront:close-mega-menus";

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function SearchSuggestionsBody({
  q,
  popularCategories,
  matchedCategories,
  products,
  loading,
  onClose,
  onGoSearch,
}: {
  q: string;
  popularCategories: SuggestCategory[];
  matchedCategories: SuggestCategory[];
  products: SuggestProduct[];
  loading: boolean;
  onClose: () => void;
  onGoSearch: (term: string) => void;
}) {
  return (
    <div className="py-2">
      {!q.trim() && popularCategories.length > 0 ? (
        <div className="mb-3 px-1">
          <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Trending categories
          </p>
          <div className="flex flex-wrap gap-1.5">
            {popularCategories.slice(0, 8).map((c) => (
              <Link
                key={c.slug}
                href={c.href}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition hover:border-[#E0703A]/40 hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A]"
                onClick={onClose}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {q.trim() && matchedCategories.length > 0 ? (
        <div className="mb-2">
          <p className="pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Categories
          </p>
          <ul>
            {matchedCategories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={c.href}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-[14px] text-neutral-800 transition-colors hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A]"
                  onClick={onClose}
                >
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="text-[11px] text-neutral-400">Shop</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {q.trim() ? (
        <div className="border-t border-neutral-100 pt-2">
          <p className="pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Products
          </p>
          {loading && products.length === 0 ? (
            <ul className="py-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <span className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-neutral-100" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
                    <span className="block h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && products.length === 0 ? (
            <p className="py-3 text-[13px] text-neutral-500">
              No products match yet — tap Search to view all results.
            </p>
          ) : null}
          <ul>
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug}`}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[rgba(224,112,58,0.08)]"
                  onClick={onClose}
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-50">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[14px] leading-snug text-neutral-900">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] font-semibold text-neutral-800">
                      {formatPkr(p.price)}
                      {p.compareAtPrice && p.compareAtPrice > p.price ? (
                        <span className="ml-1.5 font-normal text-neutral-400 line-through">
                          {formatPkr(p.compareAtPrice)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {q.trim() ? (
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-100 px-3 py-3 text-left text-[14px] font-semibold transition-colors hover:bg-neutral-50"
              style={{ color: NAV2_ACCENT }}
              onClick={() => onGoSearch(q)}
            >
              <span className="min-w-0 truncate">View all results for “{q.trim()}”</span>
              <span aria-hidden className="shrink-0">
                →
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Mobile-only search: icon trigger opens a full-width panel below the header
 * (same pattern as the previous navbar popover).
 */
export function HeaderMobileSearch({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const router = useRouter();
  const navLinks = useNavCollections();
  const headerNavItems = useHeaderNavMenuItems();
  const reduceMotion = useReducedMotion();
  const inputId = useId();
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollLockedRef = useRef(false);
  const openRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [hintsReady, setHintsReady] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(56);
  const [products, setProducts] = useState<SuggestProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const popularCategories: SuggestCategory[] = useMemo(() => {
    const fromCollections = navLinks.map((c) => ({
      slug: c.slug,
      name: c.name,
      href: `/collections/${c.slug}`,
    }));
    const fromHeader = headerNavItems
      .filter((h) => h.slug && !fromCollections.some((c) => c.slug === h.slug))
      .map((h) => ({
        slug: h.slug,
        name: h.label,
        href: h.href,
      }));
    return [...fromCollections, ...fromHeader].slice(0, 8);
  }, [navLinks, headerNavItems]);

  const rotatingHints = useMemo(() => {
    const names = popularCategories.map((c) => c.name).slice(0, 5);
    return names.length > 0 ? names : ["kitchen tools", "drinkware", "home essentials"];
  }, [popularCategories]);

  const matchedCategories = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return popularCategories;
    return popularCategories
      .filter((c) => c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term))
      .slice(0, 6);
  }, [q, popularCategories]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => setHintsReady(true), []);

  useEffect(() => {
    if (!hintsReady || open || q.trim()) return;
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % rotatingHints.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [hintsReady, open, q, rotatingHints.length]);

  const measureHeader = useCallback(() => {
    const sticky = document.body.getAttribute("data-header-sticky") === "true";
    const el = document.getElementById(sticky ? "site-header-sticky" : "site-header");
    if (el) {
      setHeaderBottom(Math.ceil(el.getBoundingClientRect().bottom));
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measureHeader();
    const onScroll = () => measureHeader();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, measureHeader]);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new Event(CLOSE_MENUS));
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!scrollLockedRef.current) {
      lockScroll();
      scrollLockedRef.current = true;
    }
  }, [open]);

  const releaseScrollLock = () => {
    if (!scrollLockedRef.current) return;
    unlockScroll();
    scrollLockedRef.current = false;
  };

  useEffect(
    () => () => {
      if (scrollLockedRef.current) unlockScroll();
    },
    [],
  );

  const close = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const toggleOpen = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  useEffect(() => {
    const term = q.trim();
    abortRef.current?.abort();
    if (!open || term.length < 1) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setProducts([]);
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(term)}`, {
          signal: ac.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          setProducts([]);
          return;
        }
        const data = (await res.json()) as { products?: SuggestProduct[] };
        const list = Array.isArray(data.products) ? data.products : [];
        setProducts(
          list.slice(0, 8).map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            image: p.image,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            collection: p.collection,
          })),
        );
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setProducts([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [q, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const goSearch = (term: string) => {
    const query = term.trim();
    if (!query) return;
    close();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    goSearch(q || rotatingHints[hintIndex] || "");
  };

  const placeholder =
    hintsReady && !q
      ? `Search for ${rotatingHints[hintIndex] ?? "home essentials"}`
      : "Search products, categories…";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Search"
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex items-center rounded-md p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 ${
          open ? "text-[#E0703A]" : "text-neutral-800 hover:text-[#E0703A]"
        }`}
        onClick={toggleOpen}
      >
        <SearchIcon />
      </button>

      <AnimatePresence
        onExitComplete={() => {
          if (openRef.current) return;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!openRef.current) releaseScrollLock();
            });
          });
        }}
      >
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close search"
              className="fixed inset-x-0 bottom-0 z-[180] bg-black/55"
              style={{ top: headerBottom }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.28, ease: easeSilk } }}
              transition={{ duration: 0.28, ease: easeSilk }}
              onClick={close}
            />
            <motion.div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="fixed inset-x-0 z-[190] overflow-y-auto overscroll-contain border-b border-neutral-200 bg-white shadow-[0_16px_40px_-12px_rgba(28,29,29,0.18)]"
              style={{
                top: headerBottom,
                maxHeight: `min(calc(100dvh - ${headerBottom}px), 560px)`,
              }}
              initial={reduceMotion ? { opacity: 0 } : { y: -12, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0.14 } }
                  : { y: -10, opacity: 0, transition: { duration: 0.24, ease: easeSilk } }
              }
              transition={{ duration: 0.32, ease: easeSilk }}
            >
              <div className="mx-auto max-w-7xl shell-x py-3">
                <form
                  onSubmit={onSubmit}
                  className="flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white pl-3.5 pr-1.5 shadow-[0_0_0_0_transparent] focus-within:border-[#E0703A] focus-within:shadow-[0_0_0_3px_rgba(224,112,58,0.14)]"
                  role="search"
                >
                  <label htmlFor={inputId} className="sr-only">
                    Search products
                  </label>
                  <SearchIcon className="h-[17px] w-[17px] shrink-0 text-[#E0703A]" />
                  <input
                    ref={inputRef}
                    id={inputId}
                    name="q"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  />
                  {q.length > 0 ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                      onClick={() => {
                        setQ("");
                        setProducts([]);
                        inputRef.current?.focus();
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="h-8 shrink-0 rounded-full px-4 text-[12px] font-semibold uppercase tracking-wide text-white transition hover:opacity-95"
                    style={{ backgroundColor: NAV2_ACCENT }}
                  >
                    Search
                  </button>
                </form>

                <SearchSuggestionsBody
                  q={q}
                  popularCategories={popularCategories}
                  matchedCategories={matchedCategories}
                  products={products}
                  loading={loading}
                  onClose={close}
                  onGoSearch={goSearch}
                />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
