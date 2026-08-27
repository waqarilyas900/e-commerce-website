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
import { createPortal } from "react-dom";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { formatPkr } from "@/app/lib/format-currency";
import { NAV2_ACCENT } from "@/components/navigation/nav2-theme";

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

/**
 * AliExpress-style search with live product + category suggestions.
 * Dropdown is portaled so sticky header / overflow never clips it.
 */
export function HeaderSearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const navLinks = useNavCollections();
  const headerNavItems = useHeaderNavMenuItems();
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [hintsReady, setHintsReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
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

  useEffect(() => setMounted(true), []);
  useEffect(() => setHintsReady(true), []);

  useEffect(() => {
    if (!hintsReady || open || q.trim()) return;
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % rotatingHints.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [hintsReady, open, q, rotatingHints.length]);

  const measure = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 6,
      left: Math.max(8, r.left),
      width: Math.min(r.width, window.innerWidth - 16),
    });
  }, []);

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
  }, [open, measure, q, products.length, matchedCategories.length]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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

  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    abortRef.current?.abort();
  }, []);

  const closePanel = () => setOpen(false);

  const goSearch = (term: string) => {
    const query = term.trim();
    if (!query) return;
    closePanel();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    goSearch(q || rotatingHints[hintIndex] || "");
  };

  const placeholder =
    hintsReady && !open && !q
      ? `Search for ${rotatingHints[hintIndex] ?? "home essentials"}`
      : "Search products, categories…";

  const showClear = q.length > 0;

  const panelPos =
    open && pos && (q.trim().length > 0 || popularCategories.length > 0) ? pos : null;

  const panel =
    mounted && panelPos
      ? createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            className="fixed z-[220] overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_20px_48px_-12px_rgba(28,29,29,0.18)] ring-1 ring-black/[0.04]"
            style={{
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="max-h-[min(70dvh,420px)] overflow-y-auto overscroll-contain py-2.5">
              {!q.trim() && popularCategories.length > 0 ? (
                <div className="mb-2 px-3.5">
                  <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    Trending categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularCategories.slice(0, 6).map((c) => (
                      <Link
                        key={c.slug}
                        href={c.href}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[12px] font-medium text-neutral-700 transition hover:border-[#E0703A]/40 hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A]"
                        onClick={closePanel}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {q.trim() && matchedCategories.length > 0 ? (
                <div className="mb-1">
                  <p className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    Categories
                  </p>
                  <ul>
                    {matchedCategories.map((c) => (
                      <li key={c.slug} role="option" aria-selected={false}>
                        <Link
                          href={c.href}
                          className="flex w-full items-center gap-2.5 px-3.5 py-[9px] text-left text-[13px] text-neutral-800 transition-colors hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A] focus-visible:bg-[rgba(224,112,58,0.08)] focus-visible:outline-none"
                          onClick={closePanel}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5 shrink-0 text-neutral-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M4 7h16v12H4z" strokeLinejoin="round" />
                            <path d="M4 7l2-3h12l2 3" strokeLinejoin="round" />
                          </svg>
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <span className="text-[11px] text-neutral-400">Shop</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {q.trim() ? (
                <div className="border-t border-neutral-100 pt-1">
                  <p className="px-3.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    Products
                  </p>
                  {loading && products.length === 0 ? (
                    <ul className="px-3.5 py-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <li key={i} className="flex items-center gap-3 py-2">
                          <span className="h-11 w-11 shrink-0 animate-pulse rounded-md bg-neutral-100" />
                          <span className="flex-1 space-y-2">
                            <span className="block h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
                            <span className="block h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {!loading && products.length === 0 ? (
                    <p className="px-3.5 py-3 text-[13px] text-neutral-500">
                      No products match yet — press Enter to search all.
                    </p>
                  ) : null}
                  <ul>
                    {products.map((p) => (
                      <li key={p.id} role="option" aria-selected={false}>
                        <Link
                          href={`/products/${p.slug}`}
                          className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-[rgba(224,112,58,0.08)] focus-visible:bg-[rgba(224,112,58,0.08)] focus-visible:outline-none"
                          onClick={closePanel}
                        >
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-neutral-50">
                            {p.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-[13px] leading-snug text-neutral-900">
                              {p.name}
                            </span>
                            <span className="mt-0.5 block text-[12px] font-semibold text-neutral-800">
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
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center justify-between gap-2 border-t border-neutral-100 px-3.5 py-3 text-left text-[13px] font-semibold transition-colors hover:bg-neutral-50"
                    style={{ color: NAV2_ACCENT }}
                    onClick={() => goSearch(q)}
                  >
                    <span className="min-w-0 truncate">View all results for “{q.trim()}”</span>
                    <span aria-hidden className="shrink-0">→</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative w-full min-w-0 ${className}`.trim()}>
      <form
        onSubmit={onSubmit}
        className={`group/search flex h-10 w-full items-center gap-1 rounded-full border bg-white pl-3 pr-1 transition-[border-color,box-shadow,background-color] sm:h-[40px] ${
          open
            ? "border-[#E0703A] shadow-[0_0_0_3px_rgba(224,112,58,0.14)]"
            : "border-neutral-200 hover:border-neutral-300"
        }`}
        role="search"
      >
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            open ? "text-[#E0703A]" : "text-neutral-400 group-hover/search:text-neutral-500"
          }`}
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            className="h-[16px] w-[16px]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          value={q}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (blurTimerRef.current) {
              clearTimeout(blurTimerRef.current);
              blurTimerRef.current = null;
            }
            setOpen(true);
            measure();
          }}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => setOpen(false), 180);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />
        {showClear ? (
          <button
            type="button"
            aria-label="Clear search"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQ("");
              setProducts([]);
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        ) : null}
        <button
          type="submit"
          className="flex h-8 shrink-0 items-center justify-center rounded-full px-3.5 text-[12px] font-semibold uppercase tracking-wide text-white transition hover:opacity-95"
          style={{ backgroundColor: NAV2_ACCENT }}
          aria-label="Search"
        >
          Search
        </button>
      </form>
      {panel}
    </div>
  );
}
