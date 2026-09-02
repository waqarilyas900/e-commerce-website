"use client";

import confetti from "canvas-confetti";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPkr, STORE_CURRENCY_CODE } from "@/app/lib/format-currency";

type Props = {
  orderNumber: string | null;
  orderTotalCents: number | null;
  signedIn: boolean;
  /** Customer email for reassurance line */
  customerEmail?: string;
};

const CONFETTI_COLORS = [
  "#047857",
  "#059669",
  "#34d399",
  "#a7f3d0",
  "#fde047",
  "#fbbf24",
  "#fcd34d",
  "#ffffff",
];

function runConfettiCelebration() {
  const base = {
    colors: CONFETTI_COLORS,
    ticks: 260,
    zIndex: 9999,
  } as const;

  confetti({
    ...base,
    particleCount: 140,
    spread: 88,
    origin: { x: 0.5, y: 0.42 },
    gravity: 0.92,
    scalar: 1.05,
    startVelocity: 38,
  });

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 55,
      angle: 58,
      spread: 52,
      origin: { x: 0.08, y: 0.68 },
      gravity: 1.05,
    });
    confetti({
      ...base,
      particleCount: 55,
      angle: 122,
      spread: 52,
      origin: { x: 0.92, y: 0.68 },
      gravity: 1.05,
    });
  }, 220);

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.58 },
      gravity: 1.1,
      startVelocity: 32,
    });
  }, 480);
}

export function OrderConfirmation({
  orderNumber,
  orderTotalCents,
  signedIn,
  customerEmail,
}: Props) {
  const reduceMotion = useReducedMotion();
  const confettiDone = useRef(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (reduceMotion || confettiDone.current) return;
    confettiDone.current = true;
    runConfettiCelebration();
  }, [reduceMotion]);

  const copyOrderNumber = useCallback(async () => {
    if (!orderNumber) return;
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [orderNumber]);

  const totalRupees =
    orderTotalCents != null ? orderTotalCents / 100 : null;

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 380, damping: 28 },
    },
  };

  return (
    <div className="relative min-h-[min(70vh,720px)] py-8 sm:py-12">
      <motion.div
        className="relative mx-auto max-w-2xl px-0"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-400/20 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 ring-4 ring-white">
              <motion.svg
                viewBox="0 0 24 24"
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.08 }}
              >
                <path d="M20 6 9 17l-5-5" />
              </motion.svg>
            </div>
          </div>
        </motion.div>

        <motion.h1
          variants={item}
          className="mt-8 text-center text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
        >
          Your order is confirmed
        </motion.h1>
        <motion.p
          variants={item}
          className="mx-auto mt-3 max-w-md text-center text-base leading-relaxed text-neutral-600"
        >
          Thank you for shopping with us. We&apos;re preparing your package and will keep you
          updated. Pay cash when your order arrives.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.08),0_12px_24px_-8px_rgba(0,0,0,0.06)] ring-1 ring-neutral-950/[0.04]"
        >
          <div className="border-b border-neutral-100 bg-gradient-to-br from-neutral-50/90 to-white px-6 py-5 sm:px-8">
            <p className="text-[11px] font-semibold capitalize tracking-[0.2em] text-neutral-500">
              Order reference
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                {orderNumber ?? "—"}
              </p>
              {orderNumber ? (
                <button
                  type="button"
                  onClick={() => void copyOrderNumber()}
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  {copied ? "Copied" : "Copy number"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-0 divide-y divide-neutral-100 px-6 sm:px-8">
            {totalRupees != null ? (
              <div className="flex items-center justify-between gap-4 py-5">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Amount due on delivery</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {STORE_CURRENCY_CODE} · Cash on delivery
                  </p>
                </div>
                <p className="text-xl font-bold tabular-nums tracking-tight text-neutral-900">
                  {formatPkr(totalRupees)}
                </p>
              </div>
            ) : null}

            {customerEmail ? (
              <div className="py-5">
                <p className="text-sm font-medium text-neutral-900">Confirmation</p>
                <p className="mt-1 text-sm text-neutral-600">
                  We&apos;ll send updates to{" "}
                  <span className="font-medium text-neutral-800">{customerEmail}</span> when your
                  order ships.
                </p>
              </div>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-8 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 px-5 py-5 sm:px-6"
        >
          <p className="text-center text-sm font-semibold text-emerald-950">What happens next</p>
          <ol className="mt-4 space-y-4 text-left text-sm text-emerald-950/90">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                1
              </span>
              <span>
                <span className="font-semibold text-emerald-950">We process your order</span>
                <span className="mt-0.5 block text-emerald-900/85">
                  Our team confirms stock and packs your items carefully.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                2
              </span>
              <span>
                <span className="font-semibold text-emerald-950">Out for delivery</span>
                <span className="mt-0.5 block text-emerald-900/85">
                  You may receive SMS or email with tracking-style updates where available.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                3
              </span>
              <span>
                <span className="font-semibold text-emerald-950">Open Parcel & Pay on arrival</span>
                <span className="mt-0.5 block text-emerald-900/85">
                  Open and check your parcel in front of the courier rider. Pay cash only once you are 100% satisfied.
                </span>
              </span>
            </li>
          </ol>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/collections"
            replace
            className="inline-flex items-center justify-center btn rounded-none bg-neutral-950 text-white shadow-lg shadow-neutral-900/20 transition hover:bg-neutral-800"
          >
            Continue shopping
          </Link>
          {orderNumber ? (
            <Link
              href={`/track-order?order=${encodeURIComponent(orderNumber)}`}
              replace
              className="inline-flex items-center justify-center rounded-full border-2 border-emerald-600 bg-emerald-50 px-8 py-3.5 text-sm font-semibold text-emerald-950 transition hover:border-emerald-700 hover:bg-emerald-100"
            >
              Track this order
            </Link>
          ) : null}
          {signedIn ? (
            <Link
              href="/account/orders"
              replace
              className="inline-flex items-center justify-center rounded-full border-2 border-neutral-200 bg-white px-8 py-3.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              View order history
            </Link>
          ) : (
            <Link
              href="/signup"
              replace
              className="inline-flex items-center justify-center rounded-full border-2 border-neutral-200 bg-white px-8 py-3.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              Create an account
            </Link>
          )}
        </motion.div>

        <motion.p
          variants={item}
          className="mt-8 text-center text-xs leading-relaxed text-neutral-500"
        >
          Questions? Reply to your confirmation email or contact support with your order number
          above.
        </motion.p>
      </motion.div>
    </div>
  );
}
