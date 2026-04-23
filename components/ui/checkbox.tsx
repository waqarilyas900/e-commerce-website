"use client";

import { motion } from "framer-motion";
import { useCallback, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Visible label (right of the checkbox). */
  label: ReactNode;
  /** Optional helper text under the label. */
  description?: ReactNode;
};

/**
 * Themed animated checkbox using storefront CSS variables.
 * Keeps native input semantics (sr-only input + visual control).
 */
export function Checkbox({
  label,
  description,
  className = "",
  id,
  disabled,
  checked,
  defaultChecked,
  onChange,
  ...rest
}: CheckboxProps) {
  const uid = useId();
  const inputId = id ?? uid;
  const labelTextId = `${inputId}-text`;
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(() => Boolean(defaultChecked));

  const checkedVisual = isControlled ? Boolean(checked) : internalChecked;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(e.target.checked);
      onChange?.(e);
    },
    [isControlled, onChange]
  );

  const hasDescription = Boolean(description);

  return (
    <div
      className={`select-none flex gap-2.5 text-sm text-[color:var(--colorTextBody)] ${
        hasDescription ? "items-start" : "items-center"
      } ${disabled ? "opacity-50" : ""} ${className}`.trim()}
    >
      <label
        htmlFor={inputId}
        className={`inline-flex shrink-0 cursor-pointer items-center justify-center ${
          hasDescription ? "mt-0.5" : ""
        } ${disabled ? "cursor-not-allowed" : ""}`.trim()}
      >
        <input
          {...rest}
          id={inputId}
          type="checkbox"
          className="peer sr-only"
          disabled={disabled}
          onChange={handleChange}
          aria-labelledby={labelTextId}
          {...(isControlled ? { checked } : defaultChecked !== undefined ? { defaultChecked } : {})}
        />
        <span
          className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-[6px] border-2 border-[color:var(--colorBorder)] bg-[color:var(--colorBody)] transition-[border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] peer-checked:border-black peer-checked:bg-black peer-active:scale-[0.95] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black peer-checked:shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
          aria-hidden
        >
          {/* Checkmark — fade + gentle lift and settle */}
          <motion.span
            className="relative z-[1] flex items-center justify-center will-change-[opacity,transform]"
            initial={false}
            animate={{
              opacity: checkedVisual ? 1 : 0,
              scale: checkedVisual ? 1 : 0.72,
              y: checkedVisual ? 0 : 3,
              rotate: checkedVisual ? 0 : -10,
            }}
            transition={
              checkedVisual
                ? {
                    opacity: { duration: 0.52, ease: [0.33, 1, 0.68, 1] },
                    scale: { type: "spring", stiffness: 280, damping: 26, mass: 0.95 },
                    y: { type: "spring", stiffness: 260, damping: 28, mass: 0.9 },
                    rotate: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
                  }
                : {
                    duration: 0.44,
                    ease: [0.33, 0, 0.2, 1],
                  }
            }
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 text-white"
              fill="none"
              aria-hidden
            >
              <path
                d="M3.25 8.25 6.5 11.5 12.75 5.25"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        </span>
      </label>
      <span id={labelTextId} className="min-w-0 leading-snug">
        <span className="block">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-neutral-500">{description}</span> : null}
      </span>
    </div>
  );
}
