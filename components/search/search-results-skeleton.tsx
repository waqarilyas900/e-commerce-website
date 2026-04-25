/** Placeholder grid while search results are loading (matches ProductCard grid rhythm). */
export function SearchResultsSkeleton() {
  return (
    <div className="mt-6" aria-busy aria-label="Loading search results">
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-neutral-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white"
          >
            <div className="aspect-5/6 w-full animate-pulse bg-neutral-100" />
            <div className="space-y-2 p-3">
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
