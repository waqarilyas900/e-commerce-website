import { FALLBACK_STANDARD_DELIVERY_PAISA } from "@/lib/checkout-constants";

export type DeliverySettingsPaisa = {
  standard_delivery_paisa: number;
  free_delivery_thresholds_paisa: number[];
};

/**
 * Shipping line in PKR from the **shipping basis** subtotal (merchandise that is not per-product
 * free delivery). Pass full cart subtotal only when no products use `free_delivery`.
 */
export function computeDeliveryPkr(
  subtotalPkr: number,
  settings: DeliverySettingsPaisa,
): number {
  const subPaisa = Math.round(subtotalPkr * 100);
  const rawStd = Number(settings.standard_delivery_paisa);
  const standardPaisa = Number.isFinite(rawStd)
    ? Math.max(0, Math.round(rawStd))
    : FALLBACK_STANDARD_DELIVERY_PAISA;
  const thresholds = Array.isArray(settings.free_delivery_thresholds_paisa)
    ? settings.free_delivery_thresholds_paisa.filter((t) => Number.isFinite(t) && t >= 0)
    : [];
  const qualifiesFree = thresholds.some((t) => subPaisa >= t);
  if (qualifiesFree) return 0;
  return standardPaisa / 100;
}

/** Shortfall until the next free-delivery tier; `subtotalPkr` should match the shipping basis used in `computeDeliveryPkr`. */
export function nextFreeDeliveryGapPkr(
  subtotalPkr: number,
  thresholdsPaisa: number[],
): number | null {
  const subPaisa = Math.round(subtotalPkr * 100);
  const sorted = [...thresholdsPaisa]
    .filter((t) => Number.isFinite(t) && t > 0)
    .sort((a, b) => a - b);
  for (const t of sorted) {
    if (subPaisa < t) return (t - subPaisa) / 100;
  }
  return null;
}
