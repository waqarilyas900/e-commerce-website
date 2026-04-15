"use client";

import type { HTMLAttributes, Key } from "react";
import { Range, getTrackBackground, Direction } from "react-range";

/** react-range requires each value to sit on min + n·step; URL-driven mins can violate that. */
function snapToStep(value: number, rangeMin: number, rangeMax: number, st: number): number {
  const step = st > 0 ? st : 1;
  const clamped = Math.min(rangeMax, Math.max(rangeMin, value));
  const k = Math.round((clamped - rangeMin) / step);
  const snapped = rangeMin + k * step;
  return Math.min(rangeMax, Math.max(rangeMin, snapped));
}

/** Matches `globals.css` :root tokens for track segments. */
const TRACK_NEUTRAL = "#e8e8e1";
const TRACK_ACTIVE = "#111111";

type Props = {
  min: number;
  max: number;
  step: number;
  values: [number, number];
  onChange: (nextMin: number, nextMax: number) => void;
  /** Fires when the user releases a thumb (drag / keyboard end). */
  onFinalChange?: (nextMin: number, nextMax: number) => void;
  /** For `aria-labelledby` on the slider region. */
  labelledBy?: string;
  id?: string;
};

/**
 * Single horizontal track with two thumbs (min / max). Uses `react-range` + `getTrackBackground`.
 */
export function DualRangeSlider({ min, max, step, values, onChange, onFinalChange, labelledBy, id }: Props) {
  const vmax = max > min ? max : min + 1;
  const st = Math.max(1, step);
  const rawLo = Math.min(values[0], values[1]);
  const rawHi = Math.max(values[0], values[1]);
  let lo = snapToStep(rawLo, min, vmax, st);
  let hi = snapToStep(rawHi, min, vmax, st);
  if (lo > hi) [lo, hi] = [hi, lo];

  const emit = (vals: number[]) => {
    const a = vals[0] ?? min;
    const b = vals[1] ?? vmax;
    return [Math.min(a, b), Math.max(a, b)] as const;
  };

  return (
    <div id={id} className="box-border w-full px-3 py-2">
      <Range
        label="Price range"
        {...(labelledBy ? { labelledBy } : {})}
        step={step}
        min={min}
        max={vmax}
        values={[lo, hi]}
        onChange={(vals) => {
          const [a, b] = emit(vals);
          onChange(a, b);
        }}
        onFinalChange={
          onFinalChange
            ? (vals) => {
                const [a, b] = emit(vals);
                onFinalChange(a, b);
              }
            : undefined
        }
        direction={Direction.Right}
        renderTrack={({ props, children }) => {
          const trackProps = { ...props } as Record<string, unknown>;
          const trackKey = trackProps.key as Key | undefined;
          delete trackProps.key;
          const tp = trackProps as HTMLAttributes<HTMLDivElement>;
          return (
            <div
              key={trackKey}
              {...tp}
              className="h-2 w-full rounded-full"
              style={{
                ...tp.style,
                background: getTrackBackground({
                  min,
                  max: vmax,
                  values: [lo, hi],
                  colors: [TRACK_NEUTRAL, TRACK_ACTIVE, TRACK_NEUTRAL],
                }),
              }}
            >
              {children}
            </div>
          );
        }}
        renderThumb={({ props }) => {
          const thumbProps = { ...props } as Record<string, unknown>;
          const thumbKey = thumbProps.key as Key | undefined;
          delete thumbProps.key;
          const tp = thumbProps as HTMLAttributes<HTMLDivElement>;
          return (
            <div
              key={thumbKey}
              {...tp}
              className="flex h-5 w-5 cursor-grab touch-manipulation items-center justify-center rounded-full border-2 border-[color:var(--colorBody)] bg-[color:var(--colorBtnPrimary)] shadow-none outline-none ring-2 ring-transparent ring-offset-2 focus-visible:ring-[color:var(--colorBtnPrimary)] active:cursor-grabbing"
            />
          );
        }}
      />
    </div>
  );
}
