"use client";

import Link from "next/link";
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
  /** Current collection slug (bold in sidebar). Ignored when `saleActive` is true. */
  currentSlug: string;
  /** When true, you are on `/collections/sale` and the Sale nav item is highlighted. */
  saleActive?: boolean;
  /** All collections for the left rail (+ Sale). */
  navLinks: NavCollectionLink[];
  products: Product[];
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

function CollectionNavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-md py-2 text-[15px] leading-snug tracking-tight transition-[padding] duration-200 ease-out ${
        isActive
          ? "cursor-default pl-2 font-bold text-neutral-950"
          : "pl-2 font-normal text-neutral-800 hover:pl-4 hover:text-neutral-950"
      }`}
    >
      {children}
    </Link>
  );
}

function CollectionSidebar({
  navLinks,
  currentSlug,
  saleActive = false,
}: {
  navLinks: NavCollectionLink[];
  currentSlug: string;
  saleActive?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Collections">
      <CollectionNavLink href="/collections/sale" isActive={saleActive}>
        <span aria-hidden className="mr-1">
          ⚡
        </span>
        Sale
      </CollectionNavLink>
      {navLinks.map((c) => (
        <CollectionNavLink
          key={c.slug}
          href={`/collections/${c.slug}`}
          isActive={!saleActive && c.slug === currentSlug}
        >
          {c.name}
        </CollectionNavLink>
      ))}
    </nav>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className="h-60 animate-pulse bg-neutral-100" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-28 animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-full max-w-[90%] animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="mt-2 h-9 w-full animate-pulse rounded-md bg-neutral-100" />
      </div>
    </div>
  );
}

export function CollectionListingControls({
  maxPriceCeil,
  parsed,
  currentSlug,
  saleActive = false,
  navLinks,
  products,
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
    (next: { availability: AvailabilityFilter; priceMin: number | null; priceMax: number | null }) => {
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

  const firstRow = products.slice(0, 3);
  const rest = products.slice(3);

  return (
    <>
      {/* Filter (left) + sort (right) — reference layout */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          disabled={isListPending}
          className="inline-flex w-full max-w-[200px] cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="w-full min-w-0 sm:w-auto sm:min-w-[260px]">
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

      {/* Row 1: sidebar (1/4) + product strip (3/4 as 3 columns) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-6">
        <aside className="min-w-0 border-t border-neutral-100 pt-6 lg:border-t-0 lg:pt-0">
          <CollectionSidebar navLinks={navLinks} currentSlug={currentSlug} saleActive={saleActive} />
        </aside>

        <div
          className="min-w-0 lg:col-span-3"
          aria-busy={isListPending}
          aria-live="polite"
        >
          {isListPending ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({
                length: Math.max(3, products.length > 0 ? products.length : 6),
              }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-sm text-neutral-600">
              No products match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {firstRow.map((product) => (
                <div key={product.id} className="min-w-0">
                  <ProductCard product={product} showAddToCart={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2+: four products per row */}
      {!isListPending && rest.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4 lg:gap-6">
          {rest.map((product) => (
            <div key={product.id} className="min-w-0">
              <ProductCard product={product} showAddToCart={false} />
            </div>
          ))}
        </div>
      ) : null}

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
