"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AvailabilityFilter, ParsedCollectionQuery } from "@/app/lib/collection-query";
import { formatPkr } from "@/app/lib/format-currency";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { useScrollLock } from "@/lib/scroll-lock";
import { Radio } from "@/components/ui/radio";

type Props = {
  open: boolean;
  onClose: () => void;
  maxPriceCeil: number;
  initial: ParsedCollectionQuery;
  onApply: (next: {
    availability: AvailabilityFilter;
    priceMin: number | null;
    priceMax: number | null;
  }) => void;
};

/** Match `components/cart/CartDrawer.tsx` motion tokens (panel slides from left instead of right). */
const easeSilk: [number, number, number, number] = [0.22, 1, 0.36, 1];
const easeSoftIn: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function CollectionFilterDrawer({
  open,
  onClose,
  maxPriceCeil,
  initial,
  onApply,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityFilter>(initial.availability);
  const [minVal, setMinVal] = useState(() => initial.priceMin ?? 0);
  const [maxVal, setMaxVal] = useState(() => initial.priceMax ?? maxPriceCeil);

  const numberDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const priceStep = useMemo(() => {
    if (maxPriceCeil <= 0) return 100;
    return Math.min(5000, Math.max(100, Math.floor(maxPriceCeil / 150)));
  }, [maxPriceCeil]);

  const rangeMax = Math.max(1, maxPriceCeil);

  const runApply = useCallback(
    (patch?: Partial<{ availability: AvailabilityFilter; min: number; max: number }>) => {
      if (numberDebounceRef.current) {
        clearTimeout(numberDebounceRef.current);
        numberDebounceRef.current = null;
      }
      const av = patch?.availability ?? availability;
      const mi = patch?.min ?? minVal;
      const ma = patch?.max ?? maxVal;
      onApply({
        availability: av,
        priceMin: mi > 0 ? mi : null,
        priceMax: ma < maxPriceCeil ? ma : null,
      });
      onClose();
    },
    [availability, minVal, maxVal, maxPriceCeil, onApply, onClose],
  );

  const scheduleNumberApply = useCallback(() => {
    if (numberDebounceRef.current) clearTimeout(numberDebounceRef.current);
    numberDebounceRef.current = setTimeout(() => {
      numberDebounceRef.current = null;
      runApply({});
    }, 420);
  }, [runApply]);

  const flushNumberApply = useCallback(() => {
    if (numberDebounceRef.current) {
      clearTimeout(numberDebounceRef.current);
      numberDebounceRef.current = null;
    }
    runApply({});
  }, [runApply]);

  useEffect(() => setMounted(true), []);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setAvailability(initial.availability);
    setMinVal(initial.priceMin ?? 0);
    setMaxVal(initial.priceMax ?? maxPriceCeil);
  }, [open, initial.availability, initial.priceMin, initial.priceMax, maxPriceCeil]);

  useEffect(() => {
    return () => {
      if (numberDebounceRef.current) clearTimeout(numberDebounceRef.current);
    };
  }, []);

  const drawer = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="collection-filter-drawer"
          className="fixed inset-0 z-110"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0.12 } : { duration: 0.45, ease: easeSilk }
          }
        >
          <motion.button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0.12 } : { duration: 0.5, ease: easeSilk }
            }
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />
          <motion.aside
            className="absolute left-0 top-0 z-120 flex h-dvh max-h-dvh min-h-0 w-full min-w-0 max-w-[min(92vw,400px)] flex-col overflow-hidden border-r border-neutral-200 bg-white px-5 py-5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),24px_0_48px_-12px_rgba(0,0,0,0.18)]"
            initial={{ x: "-100%", opacity: 0.98 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{
              x: "-100%",
              opacity: 1,
              transition: prefersReducedMotion
                ? { duration: 0.12 }
                : {
                    x: {
                      type: "tween",
                      duration: 0.42,
                      ease: easeSoftIn,
                    },
                    opacity: {
                      duration: 0.25,
                      ease: easeSoftIn,
                    },
                  },
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0.18 }
                : {
                    x: {
                      type: "spring",
                      stiffness: 200,
                      damping: 36,
                      mass: 0.95,
                      restDelta: 0.5,
                      restSpeed: 0.5,
                    },
                    opacity: { duration: 0.4, ease: easeSilk },
                  }
            }
            style={{ willChange: "transform" }}
          >
            <motion.div
              className="flex shrink-0 items-center justify-between border-b border-neutral-200 pb-4"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.1 }
                  : { delay: 0.06, duration: 0.35, ease: easeSilk }
              }
            >
              <h2 className="text-lg font-semibold tracking-tight">Filter</h2>
              <motion.button
                type="button"
                aria-label="Close"
                onClick={onClose}
                whileHover={prefersReducedMotion ? {} : { scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-neutral-500 hover:bg-neutral-100"
              >
                ×
              </motion.button>
            </motion.div>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <fieldset className="min-w-0 space-y-3 px-0.5">
                <legend className="mb-1 text-sm font-semibold text-neutral-900">Availability</legend>
                <div className="flex flex-col gap-3">
                  <Radio
                    name="availability"
                    value="all"
                    checked={availability === "all"}
                    onChange={() => {
                      setAvailability("all");
                      runApply({ availability: "all", min: minVal, max: maxVal });
                    }}
                    label="All"
                  />
                  <Radio
                    name="availability"
                    value="in_stock"
                    checked={availability === "in_stock"}
                    onChange={() => {
                      setAvailability("in_stock");
                      runApply({ availability: "in_stock", min: minVal, max: maxVal });
                    }}
                    label="In stock"
                  />
                  <Radio
                    name="availability"
                    value="out_of_stock"
                    checked={availability === "out_of_stock"}
                    onChange={() => {
                      setAvailability("out_of_stock");
                      runApply({ availability: "out_of_stock", min: minVal, max: maxVal });
                    }}
                    label="Out of stock"
                  />
                </div>
              </fieldset>

              <div className="mt-8">
                <p id="filter-price-label" className="text-sm font-semibold text-neutral-900">
                  Price
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Range: {formatPkr(0)} — {formatPkr(maxPriceCeil)}
                </p>
                <div className="mt-4 grid min-w-0 grid-cols-2 gap-3">
                  <label className="min-w-0 text-xs text-neutral-600">
                    Min (PKR)
                    <input
                      type="number"
                      min={0}
                      max={maxVal}
                      value={minVal}
                      onChange={(e) => {
                        const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                        setMinVal(Math.min(v, maxVal));
                        scheduleNumberApply();
                      }}
                      onBlur={flushNumberApply}
                      className="mt-1 w-full min-w-0 rounded-md border border-neutral-200 px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="min-w-0 text-xs text-neutral-600">
                    Max (PKR)
                    <input
                      type="number"
                      min={minVal}
                      max={rangeMax}
                      value={maxVal}
                      onChange={(e) => {
                        const v = Math.floor(Number(e.target.value) || rangeMax);
                        setMaxVal(Math.min(rangeMax, Math.max(minVal, v)));
                        scheduleNumberApply();
                      }}
                      onBlur={flushNumberApply}
                      className="mt-1 w-full min-w-0 rounded-md border border-neutral-200 px-2 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="mt-4 min-w-0">
                  <DualRangeSlider
                    min={0}
                    max={rangeMax}
                    step={Math.max(1, Math.min(priceStep, rangeMax))}
                    values={[Math.min(minVal, rangeMax), Math.min(Math.max(minVal, maxVal), rangeMax)]}
                    labelledBy="filter-price-label"
                    onChange={(nextMin, nextMax) => {
                      setMinVal(nextMin);
                      setMaxVal(nextMax);
                    }}
                    onFinalChange={(nextMin, nextMax) => {
                      setMinVal(nextMin);
                      setMaxVal(nextMax);
                      runApply({ min: nextMin, max: nextMax });
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(drawer, document.body);
}
