"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { OutflintLogoMark } from "@/components/outflint-wordmark";

type Props = {
  children: ReactNode;
  /** After successful order — header copy reflects confirmation */
  mode?: "checkout" | "complete";
};

export function CheckoutChrome({ children, mode = "checkout" }: Props) {
  const { storeName } = useStoreBrand();
  const isComplete = mode === "complete";
  const chromeClass = isComplete
    ? "min-h-screen bg-[#f6f6f6]"
    : "min-h-screen bg-white md:bg-[linear-gradient(to_right,#ffffff_0%,#ffffff_50%,#f5f5f5_50%,#f5f5f5_100%)]";
  const contentWrapClass = isComplete
    ? "mx-auto max-w-7xl shell-x py-5 sm:py-6"
    : "mx-auto max-w-7xl shell-x pb-5 pt-0 sm:pb-6";

  return (
    <div className={chromeClass}>
      {isComplete ? (
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 shell-x py-3 sm:gap-4 sm:py-4">
            <Link
              href="/"
              className="flex min-w-0 items-center"
              aria-label={`${storeName} home`}
            >
              <OutflintLogoMark size="large" />
            </Link>
            <div
              className="shrink-0 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 sm:flex sm:text-sm"
              role="status"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-emerald-700"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Order confirmed
            </div>
          </div>
        </header>
      ) : null}

      {!isComplete ? (
        <div className="hidden border-b border-neutral-200 bg-white sm:block md:hidden">
          <div className="mx-auto max-w-7xl shell-x py-2.5 sm:py-3">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs text-neutral-700 sm:text-sm">
              <span className="font-medium text-neutral-900">Delivery across Pakistan</span>
              <span className="hidden text-neutral-300 sm:inline" aria-hidden>
                ·
              </span>
              <span>Cash on delivery</span>
              <span className="hidden text-neutral-300 sm:inline" aria-hidden>
                ·
              </span>
              <span>Easy return policy — see order confirmation email</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-7xl shell-x py-2.5 sm:py-3">
            <p className="text-center text-xs text-neutral-600 sm:text-sm">
              Thank you — your order is saved. Keep your order number for support.
            </p>
          </div>
        </div>
      )}

      <div className={contentWrapClass}>{children}</div>
    </div>
  );
}
