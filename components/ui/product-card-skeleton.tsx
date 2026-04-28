/**
 * Loading placeholder aligned with `ProductCard` in `components/storefront.tsx`:
 * same image frame (rail vs grid), padding (`p-2 sm:p-2.5`), gaps, title `min-h-9`, button slot.
 */
export function ProductCardSkeleton({
  variant = "grid",
  showAddToCart = true,
}: {
  variant?: "grid" | "rail";
  showAddToCart?: boolean;
}) {
  const imageShell =
    variant === "rail"
      ? "relative h-[248px] w-full shrink-0 overflow-hidden sm:h-64"
      : "relative aspect-4/5 w-full shrink-0 overflow-hidden sm:aspect-auto sm:h-64 md:h-72 lg:h-80";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
      <div className={`${imageShell} animate-pulse bg-neutral-100`} aria-hidden />
      <div className="flex min-h-0 flex-1 flex-col gap-1 p-2 sm:gap-1.5 sm:p-2.5">
        <div className="flex min-h-9 flex-col justify-center gap-1">
          <div className="h-[13px] w-[94%] max-w-full animate-pulse rounded-sm bg-neutral-100" />
          <div className="h-[13px] w-[72%] animate-pulse rounded-sm bg-neutral-100" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-100 sm:w-28" />
        {showAddToCart ? (
          <div className="mt-auto pt-1 sm:pt-2">
            <div className="h-8 w-full animate-pulse rounded-md bg-neutral-100 sm:h-9" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
