/** Placeholder grid while search results are loading (matches ProductCard grid rhythm). */
export function SearchResultsSkeleton() {
  return (
    <div className="mt-4 sm:mt-6" aria-busy aria-label="Loading search results">
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white"
          >
            <div className="aspect-4/5 w-full animate-pulse bg-neutral-100 sm:aspect-auto sm:h-60" />
            <div className="space-y-1.5 p-2 sm:space-y-2 sm:p-3">
              <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-4 max-w-[85%] animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
