"use client";

import { motion } from "framer-motion";
import { useCallback, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Visible label (right of the control). */
  label: ReactNode;
  /** `start` — align control to first line (multi-line labels). */
  align?: "center" | "start";
};

/**
 * Themed animated radio: native input (sr-only) + custom ring (matches {@link Checkbox} motion/timing).
 */
export function Radio({
  label,
  className = "",
  id,
  disabled,
  align = "center",
  checked,
  defaultChecked,
  onChange,
  ...rest
}: RadioProps) {
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
    [isControlled, onChange],
  );

  return (
    <label
      htmlFor={inputId}
      className={`select-none flex gap-2.5 text-sm text-[color:var(--colorTextBody)] ${
        align === "start" ? "items-start" : "items-center"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`.trim()}
    >
      <input
        {...rest}
        id={inputId}
        type="radio"
        className="peer sr-only"
        disabled={disabled}
        onChange={handleChange}
        aria-labelledby={labelTextId}
        {...(isControlled ? { checked } : defaultChecked !== undefined ? { defaultChecked } : {})}
      />
      <span
        className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[color:var(--colorBorder)] bg-[color:var(--colorBody)] transition-[border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] peer-checked:border-black peer-checked:bg-black peer-active:scale-[0.95] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black peer-checked:shadow-[0_0_0_1px_rgba(0,0,0,0.06)] ${
          align === "start" ? "mt-0.5" : ""
        }`}
        aria-hidden
      >
        <motion.span
          className="block h-2 w-2 rounded-full bg-white will-change-[opacity,transform]"
          initial={false}
          animate={{
            opacity: checkedVisual ? 1 : 0,
            scale: checkedVisual ? 1 : 0.5,
          }}
          transition={
            checkedVisual
              ? {
                  opacity: { duration: 0.4, ease: [0.33, 1, 0.68, 1] },
                  scale: { type: "spring", stiffness: 320, damping: 24, mass: 0.85 },
                }
              : {
                  duration: 0.36,
                  ease: [0.33, 0, 0.2, 1],
                }
          }
        />
      </span>
      <span id={labelTextId} className="min-w-0 flex-1 leading-snug">
        {label}
      </span>
    </label>
  );
}
