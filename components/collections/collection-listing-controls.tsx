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
  /** Current collection slug (bold in sidebar). */
  currentSlug: string;
  /** All collections for the left rail (same list as Shop). */
  navLinks: NavCollectionLink[];
  products: Product[];
  /** Full-width grid without collection sidebar (e.g. `/s/[slug]` home section listing). */
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
}: {
  navLinks: NavCollectionLink[];
  currentSlug: string;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Collections">
      {navLinks.map((c) => (
        <CollectionNavLink
          key={c.slug}
          href={`/collections/${c.slug}`}
          isActive={c.slug === currentSlug}
        >
          {c.name}
        </CollectionNavLink>
      ))}
    </nav>
  );
}

export function CollectionListingControls({
  maxPriceCeil,
  parsed,
  currentSlug,
  navLinks,
  products,
  hideCollectionNav = false,
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

  const skeletonCount = Math.max(6, products.length > 0 ? products.length : 6);

  return (
    <>
      {/* Reference: Filter + Sort equal half-width columns, aligned to listing grid below */}
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
        hideCollectionNav ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-sm text-neutral-600">
            No products match your filters.
          </div>
        ) : (
          <>
            {/* Empty: keep nav + message (reference-style flow on small screens) */}
            <div className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:hidden">
              {/*
                Mobile sidebar height MUST be capped: when a store has ~15+
                collections, an unbounded sidebar inflates the grid's first
                row to 800-1000px and pushes every product below the fold.
                On a real phone the user only sees the nav and assumes the
                page is empty. The cap + overflow keeps the grid stable
                regardless of catalog size.
              */}
              <div className="min-w-0 self-start max-h-64 overflow-y-auto border-r border-neutral-100 pr-2 text-[13px] sm:pr-3 sm:text-sm">
                <CollectionSidebar navLinks={navLinks} currentSlug={currentSlug} />
              </div>
              <div className="col-span-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-sm text-neutral-600 md:col-span-2">
                No products match your filters.
              </div>
            </div>
            <div className="hidden grid-cols-4 items-stretch gap-1 sm:gap-1.5 lg:gap-2 lg:grid">
              <aside className="min-w-0 self-start border-r border-neutral-100 pr-2 text-[13px] sm:pr-3 sm:text-sm">
                <CollectionSidebar navLinks={navLinks} currentSlug={currentSlug} />
              </aside>
              <div className="col-span-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-sm text-neutral-600">
                No products match your filters.
              </div>
            </div>
          </>
        )
      ) : (
        <>
          {hideCollectionNav ? (
              <div
                className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2"
                aria-busy={isListPending}
                aria-live="polite"
              >
                {isListPending
                  ? Array.from({ length: skeletonCount }).map((_, i) => (
                      <div key={i} className="min-w-0 flex h-full min-h-0 flex-col">
                        <ProductCardSkeleton showAddToCart={cardShowAddToCart} />
                      </div>
                    ))
                  : products.map((product, idx) => (
                      <div key={product.id} className="min-w-0 flex h-full min-h-0 flex-col">
                        <ProductCard
                          product={product}
                          showAddToCart={cardShowAddToCart}
                          clampTitle
                          revealDelay={Math.min(idx * 0.07, 0.35)}
                        />
                      </div>
                    ))}
              </div>
          ) : (
            <>
              {/*
                Below lg (reference): one grid — cell 1 = collection links, then products in flow
                (row 1: nav | p1 [ | p2 on md ], then products continue; not a full-height sidebar column).
                lg+: sidebar column + 3-col product grid.
              */}
              <div
                className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:hidden"
                aria-busy={isListPending}
                aria-live="polite"
              >
                {/*
                  Cap mobile sidebar height — see note in the empty-state
                  block above. Without this an unbounded list of collections
                  hides every product behind the fold on a real phone.
                */}
                <div className="min-w-0 self-start max-h-64 overflow-y-auto border-r border-neutral-100 pr-2 text-[13px] sm:pr-3 sm:text-sm">
                  <CollectionSidebar navLinks={navLinks} currentSlug={currentSlug} />
                </div>
                {isListPending
                  ? Array.from({ length: skeletonCount }).map((_, i) => (
                      <div key={i} className="min-w-0 flex h-full min-h-0 flex-col">
                        <ProductCardSkeleton showAddToCart={cardShowAddToCart} />
                      </div>
                    ))
                  : products.map((product, idx) => (
                      <div key={product.id} className="min-w-0 flex h-full min-h-0 flex-col">
                        <ProductCard
                          product={product}
                          showAddToCart={cardShowAddToCart}
                          clampTitle
                          revealDelay={Math.min(idx * 0.07, 0.35)}
                        />
                      </div>
                    ))}
              </div>

              <div
                className="hidden grid-cols-4 items-stretch gap-1 sm:gap-1.5 lg:gap-2 lg:grid"
                aria-busy={isListPending}
                aria-live="polite"
              >
                <aside className="min-w-0 self-start border-r border-neutral-100 pr-2 text-[13px] sm:pr-3 sm:text-sm">
                  <CollectionSidebar navLinks={navLinks} currentSlug={currentSlug} />
                </aside>
                {isListPending
                  ? Array.from({ length: skeletonCount }).map((_, i) => (
                      <div key={i} className="min-w-0 flex h-full min-h-0 flex-col">
                        <ProductCardSkeleton showAddToCart={cardShowAddToCart} />
                      </div>
                    ))
                  : products.map((product, idx) => (
                      <div key={product.id} className="min-w-0 flex h-full min-h-0 flex-col">
                        <ProductCard
                          product={product}
                          showAddToCart={cardShowAddToCart}
                          clampTitle
                          revealDelay={Math.min(idx * 0.07, 0.35)}
                        />
                      </div>
                    ))}
              </div>
            </>
          )}
        </>
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
