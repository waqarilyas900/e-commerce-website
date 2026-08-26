"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
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
  products,
  cardShowAddToCart = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [isListPending, startListTransition] = useTransition();

  const spString = searchParams.toString();
  const baseParams = useMemo(() => new URLSearchParams(spString), [spString]);

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

  const skeletonCount = Math.max(8, products.length > 0 ? products.length : 8);

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          disabled={isListPending}
          className="inline-flex w-fit min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
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

      {!isListPending && products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-sm text-neutral-600">
          No products match your filters.
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
