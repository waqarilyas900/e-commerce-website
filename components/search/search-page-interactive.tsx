"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";
import type { Product } from "@/app/lib/catalog/types";
import { trackMetaPixel } from "@/lib/seo/meta-pixel-client";

type Props = {
  initialQuery: string;
  initialProducts: Product[];
};

function searchContentIdsFromProducts(list: Product[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of list.slice(0, 10)) {
    const id = p.defaultVariantId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function SearchPageInteractive({ initialQuery, initialProducts }: Props) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTrackedQueries = useRef<Set<string>>(new Set());

  function fireSearchEvent(query: string, resultProducts: Product[]) {
    const q = query.trim();
    if (!q || searchTrackedQueries.current.has(q)) return;
    searchTrackedQueries.current.add(q);
    const contentIds = searchContentIdsFromProducts(resultProducts);
    trackMetaPixel("Search", {
      search_string: q,
      content_type: "product",
      ...(contentIds.length > 0 ? { content_ids: contentIds } : {}),
    });
  }

  useEffect(() => {
    const q = initialQuery.trim();
    if (!q) return;
    fireSearchEvent(q, initialProducts);
  }, [initialQuery, initialProducts]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    setError(null);

    if (!trimmed) {
      setActiveQuery("");
      setProducts([]);
      setLoading(false);
      router.replace("/search", { scroll: false });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(trimmed)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json()) as { products?: Product[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Search failed.");
      }
      const nextProducts = data.products ?? [];
      setProducts(nextProducts);
      setActiveQuery(trimmed);
      setLoading(false);
      fireSearchEvent(trimmed, nextProducts);
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 flex max-w-xl gap-2 sm:mt-5">
        <label htmlFor="search-page-q" className="sr-only">
          Search query
        </label>
        <input
          id="search-page-q"
          name="q"
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search products…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          autoComplete="off"
          disabled={loading}
          aria-busy={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-80"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4" aria-live="polite" aria-busy>
          <p className="text-sm font-medium tracking-wide text-neutral-500">Searching catalog…</p>
          <SearchResultsSkeleton />
        </div>
      ) : activeQuery.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-600 sm:mt-8">Enter a term to search the catalog.</p>
      ) : products.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-600 sm:mt-8">
          No products matched &ldquo;{activeQuery}&rdquo;.{" "}
          <Link href="/collections" className="font-medium text-neutral-900 underline">
            Browse collections
          </Link>
        </p>
      ) : (
        <ScrollReveal delay={0.05}>
          <p className="mt-4 text-sm text-neutral-600 sm:mt-5">
            {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{activeQuery}&rdquo;
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1 sm:mt-4 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
            {products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                revealDelay={Math.min(idx * 0.08, 0.36)}
                clampTitle
              />
            ))}
          </div>
        </ScrollReveal>
      )}
    </>
  );
}
