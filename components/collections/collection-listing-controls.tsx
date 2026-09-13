"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { GroupBase, StylesConfig } from "react-select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/app/lib/catalog/types";
import type {
  AvailabilityFilter,
  CollectionSortId,
  ParsedCollectionQuery,
} from "@/app/lib/collection-query";
import { ProductCard } from "@/components/storefront";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import type { AppSelectOption } from "@/components/ui/app-select";
import { AppSelect } from "@/components/ui/app-select";
import { CollectionFilterDrawer } from "./collection-filter-drawer";
import { useListScrollRestore } from "@/hooks/use-list-scroll-restore";
import { formatPkr } from "@/app/lib/format-currency";

/** Flat react-select: no box shadows (collection toolbar). */
const sortSelectStyles: StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: 42,
    borderRadius: 6,
    borderColor: state.isFocused ? "#171717" : "#d4d4d8",
    boxShadow: "none",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: "#a3a3a3" },
  }),
  menu: (provided) => ({
    ...provided,
    boxShadow: "none",
    border: "1px solid #e5e5e5",
    borderRadius: 6,
    marginTop: 4,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 4,
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: "0.875rem",
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 4,
    backgroundColor: state.isSelected ? "#171717" : state.isFocused ? "#f5f5f5" : "transparent",
    color: state.isSelected ? "#ffffff" : "#171717",
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#171717",
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    paddingRight: 6,
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused ? "#171717" : "#525252",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  container: (provided) => ({
    ...provided,
    width: "100%",
  }),
};

const SORT_OPTIONS: { id: CollectionSortId; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "best-selling", label: "Best selling" },
  { id: "title-asc", label: "Alphabetic A–Z" },
  { id: "title-desc", label: "Alphabetic Z–A" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "date-old", label: "Date: old to new" },
  { id: "date-new", label: "Date: new to old" },
];

export type NavCollectionLink = { slug: string; name: string };

type Props = {
  maxPriceCeil: number;
  parsed: ParsedCollectionQuery;
  /** Kept for call-site compatibility; listing no longer renders an in-page category rail. */
  currentSlug: string;
  /** Kept for call-site compatibility; categories live in header + Related collections. */
  navLinks: NavCollectionLink[];
  products: Product[];
  /** Unused for layout now; retained so `/s/[slug]` call sites stay typed. */
  hideCollectionNav?: boolean;
  /** When true, product tiles include Add to cart (parity with search). Collections default off. */
  cardShowAddToCart?: boolean;
};

function buildParams(
  base: URLSearchParams,
  patch: Partial<{
    sort: CollectionSortId;
    stock: AvailabilityFilter;
    min: string | null;
    max: string | null;
  }>,
): string {
  const sp = new URLSearchParams(base.toString());
  if (patch.sort !== undefined) {
    if (patch.sort === "featured") sp.delete("sort");
    else sp.set("sort", patch.sort);
  }
  if (patch.stock !== undefined) {
    if (patch.stock === "all") sp.delete("stock");
    else sp.set("stock", patch.stock);
  }
  if (patch.min !== undefined) {
    if (patch.min == null || patch.min === "" || patch.min === "0") sp.delete("min");
    else sp.set("min", patch.min);
  }
  if (patch.max !== undefined) {
    if (patch.max == null || patch.max === "") sp.delete("max");
    else sp.set("max", patch.max);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export function CollectionListingControls({
  maxPriceCeil,
  parsed,
  currentSlug,
  navLinks,
  products,
  cardShowAddToCart = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [isListPending, startListTransition] = useTransition();
  useListScrollRestore(`list-scroll:${pathname}`);

  const spString = searchParams.toString();
  const baseParams = useMemo(() => new URLSearchParams(spString), [spString]);
  const hasActiveFilters =
    parsed.availability !== "all" ||
    (parsed.priceMin != null && parsed.priceMin > 0) ||
    parsed.priceMax != null;
  const relatedChips = useMemo(
    () => navLinks.filter((l) => l.slug !== currentSlug).slice(0, 6),
    [navLinks, currentSlug],
  );

  const pushInTransition = useCallback(
    (next: string) => {
      startListTransition(() => {
        router.push(`${pathname}${next}`, { scroll: false });
      });
    },
    [pathname, router],
  );

  const onSortChange = (sort: CollectionSortId) => {
    pushInTransition(buildParams(baseParams, { sort }));
  };

  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
    [],
  );
  const sortValue = useMemo(
    () => sortOptions.find((o) => o.value === parsed.sort) ?? sortOptions[0]!,
    [parsed.sort, sortOptions],
  );

  const onApplyFilters = useCallback(
    (next: {
      availability: AvailabilityFilter;
      priceMin: number | null;
      priceMax: number | null;
    }) => {
      pushInTransition(
        buildParams(baseParams, {
          stock: next.availability,
          min: next.priceMin != null ? String(next.priceMin) : null,
          max: next.priceMax != null ? String(next.priceMax) : null,
        }),
      );
    },
    [baseParams, pushInTransition],
  );

  const clearAvailability = useCallback(() => {
    pushInTransition(buildParams(baseParams, { stock: "all" }));
  }, [baseParams, pushInTransition]);

  const clearPriceMin = useCallback(() => {
    pushInTransition(buildParams(baseParams, { min: null }));
  }, [baseParams, pushInTransition]);

  const clearPriceMax = useCallback(() => {
    pushInTransition(buildParams(baseParams, { max: null }));
  }, [baseParams, pushInTransition]);

  const clearAllFilters = useCallback(() => {
    pushInTransition(buildParams(baseParams, { stock: "all", min: null, max: null }));
  }, [baseParams, pushInTransition]);

  const skeletonCount = Math.max(8, products.length > 0 ? products.length : 8);

  const chipClass =
    "inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white py-1.5 pl-3 pr-2 text-[12px] font-medium text-neutral-800 transition hover:border-neutral-500 hover:bg-neutral-50 active:scale-[0.98]";

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          disabled={isListPending}
          className="inline-flex w-fit min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M3 6h18M7 12h10M10 18h4" />
          </svg>
          Filter
          {hasActiveFilters ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[10px] font-semibold text-white">
              {[
                parsed.availability !== "all" ? 1 : 0,
                parsed.priceMin != null && parsed.priceMin > 0 ? 1 : 0,
                parsed.priceMax != null ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          ) : null}
        </button>
        <div className="w-[min(58vw,220px)] min-w-[160px]">
          <AppSelect
            aria-label="Sort products"
            options={sortOptions}
            value={sortValue}
            onChange={(opt) => {
              if (opt) onSortChange(opt.value as CollectionSortId);
            }}
            isSearchable={false}
            isDisabled={isListPending}
            styles={sortSelectStyles}
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {parsed.availability === "in_stock" ? (
            <button type="button" className={chipClass} onClick={clearAvailability}>
              In stock
              <span aria-hidden className="text-neutral-500">
                ×
              </span>
            </button>
          ) : null}
          {parsed.availability === "out_of_stock" ? (
            <button type="button" className={chipClass} onClick={clearAvailability}>
              Out of stock
              <span aria-hidden className="text-neutral-500">
                ×
              </span>
            </button>
          ) : null}
          {parsed.priceMin != null && parsed.priceMin > 0 ? (
            <button type="button" className={chipClass} onClick={clearPriceMin}>
              Min {formatPkr(parsed.priceMin)}
              <span aria-hidden className="text-neutral-500">
                ×
              </span>
            </button>
          ) : null}
          {parsed.priceMax != null ? (
            <button type="button" className={chipClass} onClick={clearPriceMax}>
              Max {formatPkr(parsed.priceMax)}
              <span aria-hidden className="text-neutral-500">
                ×
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[12px] font-semibold text-neutral-700 underline-offset-2 transition hover:text-neutral-950 hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}

      {!isListPending && products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-10 text-center sm:py-12">
          <p className="text-sm font-medium text-neutral-900">
            {hasActiveFilters ? "No products match your filters." : "No products in this collection yet."}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-neutral-600">
            {hasActiveFilters
              ? "Clear filters or try another collection."
              : "Browse a related collection below."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => pushInTransition("")}
                className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
              >
                Clear filters
              </button>
            ) : null}
            <Link
              href="/collections"
              className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              All collections
            </Link>
          </div>
          {relatedChips.length > 0 ? (
            <ul className="mt-5 flex list-none flex-wrap justify-center gap-2">
              {relatedChips.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/collections/${c.slug}`}
                    className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 transition hover:border-neutral-400"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2"
          aria-busy={isListPending}
          aria-live="polite"
        >
          {isListPending
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div key={i} className="flex h-full min-h-0 min-w-0 flex-col">
                  <ProductCardSkeleton showAddToCart={cardShowAddToCart} />
                </div>
              ))
            : products.map((product, idx) => (
                <div key={product.id} className="flex h-full min-h-0 min-w-0 flex-col">
                  <ProductCard
                    product={product}
                    showAddToCart={cardShowAddToCart}
                    clampTitle
                    revealDelay={Math.min(idx * 0.07, 0.35)}
                    priorityImage={idx < 8}
                  />
                </div>
              ))}
        </div>
      )}

      <CollectionFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        maxPriceCeil={maxPriceCeil}
        initial={parsed}
        onApply={onApplyFilters}
      />
    </>
  );
}
