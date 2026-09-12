/**
 * Loading placeholder aligned with `ProductCard` in `components/storefront.tsx`:
 * square image everywhere (home rail density), compact padding.
 */
export function ProductCardSkeleton({
  variant = "grid",
  showAddToCart = true,
}: {
  /** Kept for call-site compatibility; both variants use the same square frame. */
  variant?: "grid" | "rail";
  showAddToCart?: boolean;
}) {
  void variant;
  const imageShell = "relative aspect-square w-full shrink-0 overflow-hidden";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className={`${imageShell} animate-pulse bg-neutral-100`} aria-hidden />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-1.5 pb-1.5 pt-1 sm:gap-1 sm:px-2.5 sm:pb-2.5 sm:pt-1.5">
        <div className="flex min-h-8 flex-col justify-center gap-1">
          <div className="h-3 w-[94%] max-w-full animate-pulse rounded-sm bg-neutral-100" />
          <div className="h-3 w-[72%] animate-pulse rounded-sm bg-neutral-100" />
        </div>
        <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-100 sm:h-4 sm:w-28" />
        {showAddToCart ? (
          <div className="mt-auto pt-1 sm:pt-2">
            <div className="h-9 w-full animate-pulse rounded-none bg-neutral-100 sm:h-11" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
