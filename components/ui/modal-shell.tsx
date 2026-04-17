"use client";

import { useEffect, type ReactNode } from "react";
import { useScrollLock } from "@/lib/scroll-lock";

export type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  /** Primary heading (always visible at top). */
  title: ReactNode;
  /** Optional supporting line under the title. */
  subtitle?: ReactNode;
  /** Scrollable region when content is tall. */
  children: ReactNode;
  /** Sticky bottom row — typically action buttons. */
  footer?: ReactNode;
  /** Passed to the heading for `aria-labelledby`. */
  titleId?: string;
  maxWidthClassName?: string;
  zIndexClassName?: string;
  panelClassName?: string;
  /** @default true */
  showCloseButton?: boolean;
};

/**
 * Centered overlay + panel: fixed header (title + subtitle), scrollable body, optional footer.
 */
export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  titleId,
  maxWidthClassName = "max-w-md",
  zIndexClassName = "z-[200]",
  panelClassName = "",
  showCloseButton = true,
}: ModalShellProps) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${zIndexClassName}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[min(90dvh,880px)] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl ${maxWidthClassName} ${panelClassName}`.trim()}
      >
        <header className="shrink-0 border-b border-neutral-100 px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-neutral-900">
                {title}
              </h2>
              {subtitle != null && subtitle !== "" ? (
                <div className="mt-1.5 text-sm leading-relaxed text-neutral-600">{subtitle}</div>
              ) : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 cursor-pointer rounded-md p-1 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Close"
              >
                ✕
              </button>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {children}
        </div>

        {footer != null ? (
          <footer className="shrink-0 border-t border-neutral-100 bg-neutral-50/90 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
