"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavCollections } from "@/app/providers/nav-collections-provider";
import { useHeaderNavMenuItems } from "@/app/providers/header-nav-menu-provider";
import { NAV2_ACCENT, NAV2_ACCENT_RGB } from "@/components/navigation/nav2-theme";

/**
 * AliExpress-style search: dark thin pill border + circular accent button + rotating hints.
 */
export function HeaderSearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const navLinks = useNavCollections();
  const headerNavItems = useHeaderNavMenuItems();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [hintsReady, setHintsReady] = useState(false);

  const suggestions = useMemo(
    () =>
      [...new Set([...navLinks.map((c) => c.name), ...headerNavItems.map((h) => h.label)])].slice(
        0,
        8,
      ),
    [navLinks, headerNavItems],
  );

  const rotatingHints = useMemo(() => {
    const fromNav = suggestions.slice(0, 5);
    return fromNav.length > 0 ? fromNav : ["kitchen tools", "drinkware", "home essentials"];
  }, [suggestions]);

  useEffect(() => {
    setHintsReady(true);
  }, []);

  useEffect(() => {
    if (!hintsReady || focused || q.trim()) return;
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % rotatingHints.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [hintsReady, focused, q, rotatingHints.length]);

  const goSearch = (term: string) => {
    const query = term.trim();
    if (!query) return;
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    goSearch(q || rotatingHints[hintIndex] || "");
  };

  const placeholder =
    hintsReady && !focused && !q
      ? rotatingHints[hintIndex] ?? "I'm shopping for..."
      : "I'm shopping for...";

  return (
    <div className={`relative w-full min-w-0 ${className}`.trim()}>
      <form
        onSubmit={onSubmit}
        className="flex h-9 w-full items-center gap-1 rounded-full border-[0.8px] border-neutral-900 bg-white pl-4 pr-1 transition-[border-color,box-shadow] sm:h-[36px]"
        style={
          focused
            ? {
                borderColor: NAV2_ACCENT,
                boxShadow: `0 0 0 2px rgba(${NAV2_ACCENT_RGB}, 0.18)`,
              }
            : undefined
        }
        role="search"
      >
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 160);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-sm"
        />
        <button
          type="submit"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 sm:h-8 sm:w-8"
          style={{ backgroundColor: NAV2_ACCENT }}
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-[14px] w-[14px]"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </button>
      </form>

      {focused && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-neutral-200 bg-white py-2 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <p className="px-3.5 pb-1.5 text-[11px] font-semibold text-neutral-400">Popular searches</p>
          <ul>
            {suggestions.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-[9px] text-left text-[13px] text-neutral-800 transition-colors hover:bg-[rgba(224,112,58,0.08)] hover:text-[#E0703A]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQ(term);
                    goSearch(term);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 shrink-0 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                  </svg>
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
