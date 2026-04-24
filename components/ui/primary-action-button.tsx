"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

const base =
  "group relative isolate inline-flex cursor-pointer items-center justify-center overflow-hidden font-semibold transition-shadow duration-200 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const theme =
  "rounded-full bg-(--colorBtnPrimary) px-5 py-3 text-sm text-(--colorBtnPrimaryText) shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] focus-visible:ring-(--colorBtnPrimary)";

export type PrimaryActionButtonProps = Omit<HTMLMotionProps<"button">, "ref"> & {
  children: ReactNode;
  /** Shows an inline spinner and disables the button (e.g. while adding to cart). */
  loading?: boolean;
};

/**
 * Primary CTA using theme tokens (`--colorBtnPrimary` / `--colorBtnPrimaryText`).
 * Spring tap/hover + subtle sheen for a polished feel.
 */
export const PrimaryActionButton = forwardRef<HTMLButtonElement, PrimaryActionButtonProps>(
  function PrimaryActionButton({ className, children, disabled, loading, ...rest }, ref) {
    const inactive = Boolean(disabled || loading);
    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={inactive}
        aria-busy={loading}
        whileHover={
          inactive
            ? undefined
            : {
                scale: 1.02,
                y: -1,
              }
        }
        whileTap={inactive ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 520, damping: 28, mass: 0.6 }}
        className={[base, theme, className].filter(Boolean).join(" ")}
        {...rest}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="absolute inset-0 -translate-x-full skew-x-[-18deg] bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
        </span>
        <span className="relative z-10 flex min-h-5 items-center justify-center">
          <span className={loading ? "invisible" : undefined}>{children}</span>
          {loading ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-(--colorBtnPrimaryText) border-t-transparent"
                aria-hidden
              />
              <span className="sr-only">Loading</span>
            </span>
          ) : null}
        </span>
      </motion.button>
    );
  },
);
