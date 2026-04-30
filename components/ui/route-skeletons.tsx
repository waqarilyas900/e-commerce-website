/**
 * Shared route-level skeletons rendered inside `loading.tsx` Suspense
 * boundaries. The point isn't pixel-perfect parity with the final page —
 * it's giving the user a stable, predictable shape while the server
 * computes the page, so the click feels "instant" even when the underlying
 * query takes ~600 ms.
 *
 * Each skeleton is intentionally cheap (no JS, no images, only Tailwind +
 * a single `animate-pulse`) so it streams down with the layout shell and
 * paints in well under one frame.
 */

import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-100 ${className}`} aria-hidden />;
}

/** PDP main image + thumbnails + buy box. Mirrors `ProductPdp` structure. */
export function ProductDetailSkeleton() {
  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      aria-busy
      aria-live="polite"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <div className="space-y-3">
          <SkeletonBox className="aspect-square w-full" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="aspect-square w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <SkeletonBox className="h-7 w-2/3" />
          <SkeletonBox className="h-5 w-1/3" />
          <SkeletonBox className="h-9 w-40" />
          <div className="space-y-2 pt-2">
            <SkeletonBox className="h-4 w-1/4" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox key={i} className="h-9 w-14" />
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <SkeletonBox className="h-4 w-1/4" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
          <SkeletonBox className="mt-4 h-11 w-full" />
          <SkeletonBox className="h-10 w-full" />
          <div className="space-y-2 pt-4">
            <SkeletonBox className="h-4 w-full" />
            <SkeletonBox className="h-4 w-full" />
            <SkeletonBox className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </main>
  );
}

type CollectionListingSkeletonProps = {
  /** Show the left-hand navigation column (collection landing). */
  showSideNav?: boolean;
  /** Number of skeleton cards to render. */
  count?: number;
  /** Show a "Add to cart" button slot inside each card skeleton. */
  showAddToCart?: boolean;
  /** Optional heading text height — keeps layout stable above grid. */
  headingHeightClass?: string;
};

export function CollectionListingSkeleton({
  showSideNav = false,
  count = 8,
  showAddToCart = false,
  headingHeightClass = "h-9 w-2/3 sm:w-1/3",
}: CollectionListingSkeletonProps) {
  const grid = (cols: string) => (
    <div className={`grid items-stretch gap-1 sm:gap-1.5 md:gap-2 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} showAddToCart={showAddToCart} />
      ))}
    </div>
  );

  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      aria-busy
      aria-live="polite"
    >
      <header className="mb-6 text-center sm:mb-10">
        <SkeletonBox className={`mx-auto ${headingHeightClass}`} />
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <SkeletonBox className="h-10" />
        <SkeletonBox className="h-10" />
      </div>

      {showSideNav ? (
        <>
          <div className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:hidden">
            <SkeletonBox className="h-40 max-w-36" />
            {Array.from({ length: count - 1 }).map((_, i) => (
              <ProductCardSkeleton key={i} showAddToCart={showAddToCart} />
            ))}
          </div>
          <div className="hidden gap-2 lg:grid lg:grid-cols-4 lg:gap-2">
            <SkeletonBox className="h-40" />
            <div className="grid min-w-0 grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:col-span-3 lg:grid-cols-3 lg:gap-2">
              {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} showAddToCart={showAddToCart} />
              ))}
            </div>
          </div>
        </>
      ) : (
        grid("grid-cols-2 md:grid-cols-3 lg:grid-cols-4")
      )}
    </main>
  );
}

export function PolicyPageSkeleton() {
  return (
    <main
      id="MainContent"
      className="main-content bg-linear-to-b from-neutral-50 to-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      aria-busy
      aria-live="polite"
    >
      <div className="mx-auto max-w-5xl shell-x">
        <SkeletonBox className="h-4 w-24" />
        <header className="mt-6 border-b border-neutral-200/90 pb-8">
          <SkeletonBox className="h-8 w-2/3" />
          <SkeletonBox className="mt-3 h-4 w-3/4" />
          <SkeletonBox className="mt-2 h-4 w-1/2" />
        </header>
        <div className="mt-10 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBox key={i} className={`h-4 ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-11/12" : "w-3/4"}`} />
          ))}
        </div>
      </div>
    </main>
  );
}

export function PoliciesIndexSkeleton() {
  return (
    <main
      id="MainContent"
      className="main-content bg-linear-to-b from-neutral-50 to-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      aria-busy
      aria-live="polite"
    >
      <div className="mx-auto max-w-5xl shell-x">
        <SkeletonBox className="h-4 w-24" />
        <header className="mt-6 border-b border-neutral-200/90 pb-8">
          <SkeletonBox className="h-8 w-1/2" />
          <SkeletonBox className="mt-3 h-4 w-3/4" />
        </header>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <SkeletonBox className="h-24 w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export function SearchPageSkeleton() {
  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      aria-busy
      aria-live="polite"
    >
      <SkeletonBox className="h-9 w-32 sm:w-40" />
      <SkeletonBox className="mt-4 h-12 w-full" />
      <div className="mt-6 grid grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} showAddToCart={false} />
        ))}
      </div>
    </main>
  );
}

export function AccountPageSkeleton() {
  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-5xl shell-x py-5 sm:py-6"
      aria-busy
      aria-live="polite"
    >
      <SkeletonBox className="h-8 w-40" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="mt-8 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </main>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      aria-busy
      aria-live="polite"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-10">
        <div className="space-y-4">
          <SkeletonBox className="h-7 w-1/3" />
          <SkeletonBox className="h-12 w-full" />
          <SkeletonBox className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonBox className="h-12" />
            <SkeletonBox className="h-12" />
          </div>
          <SkeletonBox className="h-12 w-full" />
          <SkeletonBox className="h-12 w-full" />
          <SkeletonBox className="mt-4 h-11 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonBox className="h-7 w-1/2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBox key={i} className="h-16 w-full rounded-lg" />
          ))}
          <SkeletonBox className="h-px w-full" />
          <SkeletonBox className="h-5 w-2/3" />
          <SkeletonBox className="h-5 w-1/2" />
          <SkeletonBox className="h-7 w-3/4" />
        </div>
      </div>
    </main>
  );
}

/** Generic full-page skeleton — used by `app/loading.tsx` as the safety net. */
export function GenericPageSkeleton() {
  return (
    <main
      id="MainContent"
      className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      aria-busy
      aria-live="polite"
    >
      <SkeletonBox className="h-7 w-1/3" />
      <div className="mt-4 space-y-3">
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-4 w-11/12" />
        <SkeletonBox className="h-4 w-3/4" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} showAddToCart={false} />
        ))}
      </div>
    </main>
  );
}
