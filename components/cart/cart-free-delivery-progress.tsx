"use client";

import { useMemo } from "react";
import { formatPkr } from "@/app/lib/format-currency";
import { computeDeliveryPkr, nextFreeDeliveryGapPkr } from "@/app/lib/delivery-pricing";
import type { StoreDeliverySettingsState } from "@/app/lib/fetch-store-delivery-settings";
import { FALLBACK_STANDARD_DELIVERY_PAISA } from "@/lib/checkout-constants";

type Props = {
  subtotalPkr: number;
  settings: StoreDeliverySettingsState | null;
  loading: boolean;
};

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Tiered free-delivery progress (store_settings). Renders nothing if admin has not configured
 * `free_delivery_thresholds_paisa` or while data is unavailable — no placeholder copy.
 */
export function CartFreeDeliveryProgress({ subtotalPkr, settings, loading }: Props) {
  const rawThresholds = settings?.freeThresholdsPaisa ?? [];
  const standardPaisa = settings?.standardPaisa ?? FALLBACK_STANDARD_DELIVERY_PAISA;

  const thresholdsPaisa = useMemo(
    () => [...new Set(rawThresholds.filter((t) => Number.isFinite(t) && t > 0))].sort((a, b) => a - b),
    [rawThresholds],
  );

  const hasTiers = thresholdsPaisa.length > 0;

  const deliveryPkr = useMemo(
    () =>
      computeDeliveryPkr(subtotalPkr, {
        standard_delivery_paisa: standardPaisa,
        free_delivery_thresholds_paisa: thresholdsPaisa,
      }),
    [subtotalPkr, standardPaisa, thresholdsPaisa],
  );

  const gapPkr = useMemo(
    () => nextFreeDeliveryGapPkr(subtotalPkr, thresholdsPaisa),
    [subtotalPkr, thresholdsPaisa],
  );

  const subPaisa = Math.round(subtotalPkr * 100);
  const maxPaisa = hasTiers ? thresholdsPaisa[thresholdsPaisa.length - 1]! : 0;
  const fillPct =
    maxPaisa > 0 ? Math.min(100, Math.max(0, (subPaisa / maxPaisa) * 100)) : 0;

  /** Next tier index for messaging (smallest threshold not yet reached). */
  const nextIdx = useMemo(() => {
    if (!hasTiers) return -1;
    const i = thresholdsPaisa.findIndex((t) => subPaisa < t);
    return i === -1 ? -1 : i;
  }, [hasTiers, thresholdsPaisa, subPaisa]);

  if (loading && !hasTiers) {
    return (
      <div
        className="mb-4 h-1 w-full animate-pulse rounded-full bg-neutral-200"
        aria-hidden
      />
    );
  }

  if (!hasTiers) {
    return null;
  }

  const statusLine =
    deliveryPkr === 0 ? (
      <p className="text-center text-[15px] font-semibold leading-snug text-neutral-900">
        You&apos;ve unlocked <span className="text-emerald-700">free delivery</span> on this order.
      </p>
    ) : gapPkr != null && nextIdx >= 0 ? (
      <p className="text-center text-[15px] font-semibold leading-snug text-neutral-900">
        You are{" "}
        <span className="tabular-nums">{formatPkr(gapPkr)}</span> away from{" "}
        {nextIdx === 0 ? "Free shipping" : "Tiered coupon"}
      </p>
    ) : null;

  return (
    <div className="mb-5">
      <div className="relative pt-1">
        <div className="relative h-[3px] overflow-hidden rounded-full bg-neutral-200">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-neutral-900 transition-[width] duration-500 ease-out"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        <div className="relative mt-5 min-h-18">
          {thresholdsPaisa.map((tp, idx) => {
            const posPct = maxPaisa > 0 ? (tp / maxPaisa) * 100 : 0;
            const achieved = subPaisa >= tp;
            const isFirst = idx === 0;

            return (
              <div
                key={`${tp}-${idx}`}
                className="absolute top-0 flex w-21 -translate-x-1/2 flex-col items-center text-center"
                style={{ left: `${posPct}%` }}
              >
                <div
                  className={
                    achieved
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm"
                  }
                >
                  {achieved ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : isFirst ? (
                    <TruckIcon className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-bold">%</span>
                  )}
                </div>
                <span className="mt-2 text-[13px] font-semibold leading-tight text-neutral-900">
                  {isFirst ? "Free shipping" : "Tiered coupon"}
                </span>
                <span className="mt-0.5 text-[12px] tabular-nums text-neutral-500">
                  {formatPkr(tp / 100)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 border-t border-neutral-100 pt-4">{statusLine}</div>
    </div>
  );
}
