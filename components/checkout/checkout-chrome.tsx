"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import { useStoreBrand } from "@/app/providers/store-brand-provider";

type Props = {
  children: ReactNode;
  /** After successful order — header copy reflects confirmation */
  mode?: "checkout" | "complete";
};

export function CheckoutChrome({ children, mode = "checkout" }: Props) {
  const { storeName } = useStoreBrand();
  const isComplete = mode === "complete";

  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/dummy-logo.svg"
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
            />
            <span className="truncate text-sm font-semibold capitalize tracking-wide text-neutral-900 sm:text-base">
              {storeName}
            </span>
          </Link>
          <div
            className={`shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:flex sm:text-sm ${
              isComplete ? "flex" : "hidden sm:flex"
            } ${
              isComplete
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
            role="status"
          >
            {isComplete ? (
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
            ) : (
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            )}
            {isComplete ? "Order confirmed" : "Secure checkout"}
          </div>
        </div>
      </header>

      {!isComplete ? (
        <div className="hidden border-b border-neutral-200 bg-white sm:block">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
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
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-center text-xs text-neutral-600 sm:text-sm">
              Thank you — your order is saved. Keep your order number for support.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
