"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/app/lib/catalog/types";
import { ProductCard } from "@/components/storefront";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { getRecentlyViewedSlugs } from "@/lib/recently-viewed";

type Props = {
  /** Omit current PDP from the rail when set. */
  excludeSlug?: string;
  className?: string;
};

export function RecentlyViewedSection({ excludeSlug, className = "" }: Props) {
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    const slugs = getRecentlyViewedSlugs(excludeSlug);
    if (slugs.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;
    void fetch(`/api/catalog/recently-viewed?slugs=${encodeURIComponent(slugs.join(","))}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? (data as Product[]) : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [excludeSlug]);

  if (items === null) {
    return (
      <section className={`mt-8 sm:mt-10 ${className}`.trim()}>
        <h2 className="text-[1.50rem] font-semibold tracking-tight sm:text-2xl">
          Recently viewed
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <ProductCardSkeleton key={idx} />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className={`mt-8 sm:mt-10 ${className}`.trim()}>
      <h2 className="text-[1.50rem] font-semibold tracking-tight sm:text-2xl">
        Recently viewed
      </h2>
      <div className="mt-6 sm:mt-8 md:hidden">
        <ul
          className="-mx-2 flex list-none items-stretch gap-1 overflow-x-auto scroll-px-2 scroll-smooth px-2 pb-2 pt-1 snap-x snap-mandatory sm:mx-0 sm:gap-1.5 sm:px-0 sm:scroll-px-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex w-[calc((100vw-1.25rem)/1.5)] min-w-[172px] max-w-[232px] shrink-0 snap-start snap-always flex-col sm:w-[200px] sm:max-w-none"
            >
              <div className="flex h-full min-h-0 flex-1 flex-col">
                <ProductCard
                  product={item}
                  showAddToCart={false}
                  rail
                  clampTitle
                  revealDelay={Math.min(idx * 0.08, 0.36)}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 hidden md:mt-8 md:grid md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
        {items.map((item, idx) => (
          <ProductCard
            key={item.id}
            product={item}
            showAddToCart={false}
            clampTitle
            revealDelay={Math.min(idx * 0.08, 0.36)}
          />
        ))}
      </div>
    </section>
  );
}
