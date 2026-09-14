"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Product } from "@/app/lib/catalog/types";
import { ProductCard } from "@/components/storefront";

const PAGE_SIZE = 24;
/** First two desktop rows (5-col) — load eagerly for LCP. */
const EAGER_COUNT = 10;

/** Progressive reveal for the /collections hub “All products” grid. */
export function CollectionsAllProducts({ products }: { products: Product[] }) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(PAGE_SIZE, products.length),
  );
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const visible = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount],
  );
  const remaining = Math.max(0, products.length - visibleCount);

  const onLoadMore = useCallback(() => {
    if (isPending || remaining <= 0) return;
    startTransition(() => {
      setVisibleCount((n) => Math.min(products.length, n + PAGE_SIZE));
    });
  }, [isPending, remaining, products.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || remaining <= 0) return;
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { root: null, rootMargin: "480px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMore, remaining, visibleCount]);

  return (
    <section>
      <h2 className="text-center text-[1.50rem] font-semibold tracking-tight sm:text-2xl">
        All products
      </h2>
      <p className="mt-1.5 text-center text-xs text-neutral-500 sm:text-sm">
        {products.length} {products.length === 1 ? "item" : "items"}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-1 sm:mt-6 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-5 lg:gap-2">
        {visible.map((product, idx) => (
          <ProductCard
            key={product.id}
            product={product}
            showAddToCart={false}
            revealDelay={Math.min(idx * 0.04, 0.24)}
            clampTitle
            priorityImage={idx < EAGER_COUNT}
          />
        ))}
      </div>
      {remaining > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8">
          <div ref={sentinelRef} className="h-px w-full" aria-hidden />
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isPending}
            aria-busy={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-none border border-neutral-900 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-950 hover:text-white active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {isPending ? (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-neutral-900"
                aria-hidden
              />
            ) : null}
            Load more
            {!isPending ? (
              <span className="font-medium text-neutral-500">({remaining})</span>
            ) : null}
          </button>
        </div>
      ) : null}
    </section>
  );
}
