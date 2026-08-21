"use client";

import { useId } from "react";

const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

/** Empty / half-star track — matches PDP (`#d4d4d8`). */
export const STAR_EMPTY_COLOR = "#d4d4d8";

/** Filled star color class — matches PDP (`text-amber-500`). */
export const STAR_FILLED_CLASS = "text-amber-500";

type StarRatingProps = {
  value: number;
  /** Pixel size of each star. Default 22 matches PDP. */
  size?: number;
  className?: string;
  /** When true, wrap with aria-label for standalone use (e.g. product cards). */
  labeled?: boolean;
};

/**
 * Read-only star row used on PDP, product cards, trust strip, and reviews.
 * Half stars via linearGradient; filled via currentColor (`amber-500`).
 */
export function StarRating({
  value,
  size = 22,
  className = "",
  labeled = false,
}: StarRatingProps) {
  const uid = useId().replace(/:/g, "");
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const label = `${v.toFixed(1)} out of 5 stars`;

  return (
    <span
      className={`inline-flex items-center gap-px ${STAR_FILLED_CLASS} ${className}`.trim()}
      aria-hidden={labeled ? undefined : true}
      aria-label={labeled ? label : undefined}
      role={labeled ? "img" : undefined}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = v >= i;
        const half = !filled && v >= i - 0.5;
        const gradId = `star-half-${uid}-${i}`;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className="shrink-0"
            fill="currentColor"
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={gradId} x1="0" x2="100%" y1="0" y2="0">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor={STAR_EMPTY_COLOR} />
                  </linearGradient>
                </defs>
                <path fill={`url(#${gradId})`} d={STAR_PATH} />
              </>
            ) : (
              <path
                fill={filled ? "currentColor" : STAR_EMPTY_COLOR}
                d={STAR_PATH}
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}
