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

/** Nudge label boxes inward near drawer edges so “Free shipping” never clips (overflow-safe). */
function labelShiftPx(posPct: number): number {
  if (posPct < 22) return Math.round((22 - posPct) * 0.45);
  if (posPct > 78) return -Math.round((posPct - 78) * 0.45);
  return 0;
}

/**
 * Tiered free-delivery progress — aligned with store_settings + checkout rules.
 * Renders nothing if no thresholds configured.
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

  const nextIdx = useMemo(() => {
    if (!hasTiers) return -1;
    const i = thresholdsPaisa.findIndex((t) => subPaisa < t);
    return i === -1 ? -1 : i;
  }, [hasTiers, thresholdsPaisa, subPaisa]);

  if (loading && !hasTiers) {
    return (
      <div className="mb-4 h-1 w-full animate-pulse rounded-full bg-neutral-200" aria-hidden />
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
        You are <span className="tabular-nums">{formatPkr(gapPkr)}</span> away from{" "}
        {nextIdx === 0 ? "Free shipping" : "Tiered coupon"}
      </p>
    ) : null;

  return (
    <div className="mb-4 w-full min-w-0 px-0.5">
      <div className="relative w-full min-w-0">
        {/* Track + icons: line bisects circles; equal py so the bar has breathing room */}
        <div className="relative w-full min-w-0 shrink-0 pt-3 pb-1">
          <div className="relative h-12 w-full min-w-0">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-2 -translate-y-1/2 rounded-full bg-neutral-200"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-0 top-1/2 z-0 h-2 -translate-y-1/2 rounded-full bg-neutral-900 transition-[width] duration-500 ease-out"
              style={{ width: `${fillPct}%` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fillPct)}
              aria-label="Progress toward delivery rewards"
            />
            {thresholdsPaisa.map((tp, idx) => {
              const posPct = maxPaisa > 0 ? (tp / maxPaisa) * 100 : 0;
              const achieved = subPaisa >= tp;
              const isFirst = idx === 0;

              return (
                <div
                  key={`icon-${tp}-${idx}`}
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${posPct}%` }}
                >
                  <div
                    className={
                      achieved
                        ? "flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm ring-[3px] ring-white"
                        : "flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 shadow-sm ring-[3px] ring-white"
                    }
                  >
                    {achieved ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : isFirst ? (
                      <TruckIcon className="h-[17px] w-[17px]" />
                    ) : (
                      <span className="text-[15px] font-bold leading-none">%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Labels: two lines under each node; min-h reserves space for absolute children */}
        <div className="relative mt-0.5 min-h-[3rem] w-full min-w-0">
          {thresholdsPaisa.map((tp, idx) => {
            const posPct = maxPaisa > 0 ? (tp / maxPaisa) * 100 : 0;
            const isFirst = idx === 0;
            const shift = labelShiftPx(posPct);

            return (
              <div
                key={`label-${tp}-${idx}`}
                className="absolute top-0 flex max-w-[min(9.5rem,calc(100vw-4rem))] min-w-0 flex-col items-center text-center"
                style={{
                  left: `${posPct}%`,
                  transform: `translateX(calc(-50% + ${shift}px))`,
                }}
              >
                <span className="w-full text-[13px] font-semibold leading-tight text-neutral-900">
                  {isFirst ? "Free shipping" : "Tiered coupon"}
                </span>
                <span className="mt-0 text-[12px] tabular-nums leading-none text-neutral-500">
                  {formatPkr(tp / 100)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5">{statusLine}</div>
    </div>
  );
}
