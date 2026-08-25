import { formatPkrAmount, STORE_CURRENCY_CODE } from "@/app/lib/format-currency";

type ProductCardPriceProps = {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
};

/**
 * AliExpress-style card price: small PKR, large sale price, small compare-at on the same line, Save on the right.
 */
export function ProductCardPrice({
  price,
  compareAtPrice,
  className = "",
}: ProductCardPriceProps) {
  const onSale = compareAtPrice != null && compareAtPrice > price;

  if (!onSale) {
    return (
      <div className={`flex min-w-0 items-baseline gap-1 ${className}`.trim()}>
        <span className="shrink-0 text-[10px] font-semibold uppercase leading-none tracking-wide text-neutral-500 sm:text-[11px]">
          {STORE_CURRENCY_CODE}
        </span>
        <span className="truncate text-[1.125rem] font-bold leading-none tracking-tight text-neutral-900 sm:text-[1.25rem]">
          {formatPkrAmount(price)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-baseline justify-between gap-2 ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="shrink-0 text-[10px] font-semibold uppercase leading-none tracking-wide text-neutral-500 sm:text-[11px]">
          {STORE_CURRENCY_CODE}
        </span>
        <span className="text-[1.125rem] font-bold leading-none tracking-tight text-neutral-900 sm:text-[1.25rem]">
          {formatPkrAmount(price)}
        </span>
        <span className="text-[11px] leading-none text-neutral-400 line-through sm:text-xs">
          {formatPkrAmount(compareAtPrice)}
        </span>
      </div>
      <p className="shrink-0 text-right text-[12px] font-medium leading-tight text-red-600 sm:text-[13px]">
        Save {formatPkrAmount(compareAtPrice - price)}
      </p>
    </div>
  );
}
