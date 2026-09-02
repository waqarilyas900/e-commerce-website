import type { ResolvedCartLine } from "@/app/providers/cart-provider";

/** Valid compare-at only when strictly above the selling price. */
export function normalizeCompareAtPrice(
  unitPrice: number,
  compareAt?: number | null,
): number | undefined {
  if (compareAt == null || !Number.isFinite(compareAt)) return undefined;
  if (compareAt <= unitPrice) return undefined;
  return compareAt;
}

export function lineCompareAtSavingsPkr(
  unitPrice: number,
  quantity: number,
  compareAtPrice?: number,
): number {
  const compareAt = normalizeCompareAtPrice(unitPrice, compareAtPrice);
  if (!compareAt) return 0;
  return Math.max(0, (compareAt - unitPrice) * quantity);
}

/** Sum of (compare-at − sale) × qty across resolved cart lines. */
export function computeCompareAtSavingsPkr(lines: readonly ResolvedCartLine[]): number {
  return lines.reduce(
    (sum, { line, unitPrice, compareAtPrice }) =>
      sum + lineCompareAtSavingsPkr(unitPrice, line.quantity, compareAtPrice),
    0,
  );
}
