"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Visible label (right of the control). */
  label: ReactNode;
};

/**
 * Themed radio: native input (sr-only) + custom ring using storefront CSS variables
 * (`--colorBorder`, `--colorBtnPrimary`, `--colorBtnPrimaryText`, `--colorBody`).
 */
export function Radio({ label, className = "", id, disabled, ...rest }: RadioProps) {
  const uid = useId();
  const inputId = id ?? uid;

  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer items-center gap-3 text-sm text-[color:var(--colorTextBody)] ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`.trim()}
    >
      <input id={inputId} type="radio" className="peer sr-only" disabled={disabled} {...rest} />
      <span
        className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-[color:var(--colorBorder)] bg-[color:var(--colorBody)] transition-[border-color,background-color] peer-checked:border-[color:var(--colorBtnPrimary)] peer-checked:bg-[color:var(--colorBtnPrimary)] peer-checked:[&>span]:opacity-100 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--colorBtnPrimary)] peer-disabled:cursor-not-allowed"
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--colorBtnPrimaryText)] opacity-0 transition-opacity" />
      </span>
      <span>{label}</span>
    </label>
  );
}
