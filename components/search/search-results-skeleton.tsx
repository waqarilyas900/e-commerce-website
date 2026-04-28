import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

/** Placeholder grid while search results load (matches ProductCard layout). */
export function SearchResultsSkeleton() {
  return (
    <div className="mt-4 sm:mt-6" aria-busy aria-label="Loading search results">
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
