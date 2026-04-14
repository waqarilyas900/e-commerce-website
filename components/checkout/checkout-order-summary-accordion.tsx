"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatPkr } from "@/app/lib/format-currency";
import type { ResolvedCartLine } from "@/app/providers/cart-provider";

const easeCheckout: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Props = {
  id: string;
  expanded: boolean;
  onToggle: () => void;
  lines: Line[];
  subtotal: number;
  shipping: number;
  total: number;
  discountCode: string;
  onDiscountCodeChange: (value: string) => void;
  onApplyDiscount: () => void;
  discountApplied: boolean;
  discountNotice: string | null;
};

type Line = ResolvedCartLine;

type SummaryBodyProps = {
  lines: Line[];
  subtotal: number;
  shipping: number;
  total: number;
  discountCode: string;
  onDiscountCodeChange: (value: string) => void;
  onApplyDiscount: () => void;
  discountApplied: boolean;
  discountNotice: string | null;
  inert?: boolean;
};

function CheckoutOrderSummaryBody({
  lines,
  subtotal,
  shipping,
  total,
  discountCode,
  onDiscountCodeChange,
  onApplyDiscount,
  discountApplied,
  discountNotice,
  inert = false,
}: SummaryBodyProps) {
  return (
    <div
      className={`border-t border-neutral-200 bg-white px-4 py-4 md:border-t-0 md:bg-transparent md:px-0 ${inert ? "pointer-events-none" : ""}`}
    >
      <ul className="space-y-4 border-b border-neutral-200 pb-4">
        {lines.map(({ line, product, unitPrice, variantLabel }) => {
          const lineTotal = unitPrice * line.quantity;
          return (
            <li key={line.variantId} className="flex gap-3 text-sm">
              <div className="relative h-16 w-16 shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${product.image})` }}
                    role="img"
                    aria-label=""
                  />
                </div>
                <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-950 px-1 text-[10px] font-semibold text-white">
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-neutral-900">{product.name}</p>
                {variantLabel ? (
                  <p className="mt-0.5 text-xs text-neutral-500">{variantLabel}</p>
                ) : null}
              </div>
              <p className="shrink-0 self-start tabular-nums font-semibold text-neutral-900">
                {formatPkr(lineTotal)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={discountCode}
          onChange={(e) => onDiscountCodeChange(e.target.value)}
          placeholder="Discount code"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
        />
        <button
          type="button"
          onClick={onApplyDiscount}
          className="shrink-0 rounded-md border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200"
        >
          Apply
        </button>
      </div>
      {discountNotice ? (
        <p className="mt-2 text-xs text-neutral-600" role="status">
          {discountNotice}
        </p>
      ) : null}

      <div className="mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4 text-neutral-700">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatPkr(subtotal)}</span>
        </div>
        <div className="flex justify-between gap-4 text-neutral-700">
          <span className="inline-flex items-center gap-1.5">
            Shipping
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-neutral-400 text-[10px] font-semibold text-neutral-600"
              title="Delivery fee for your area. Final charges are confirmed before dispatch."
            >
              ?
            </span>
          </span>
          <span className="tabular-nums">{formatPkr(shipping)}</span>
        </div>
        {discountApplied ? (
          <div className="flex justify-between gap-4 text-neutral-700">
            <span>Discount</span>
            <span className="tabular-nums text-neutral-600">{formatPkr(0)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        <div className="flex items-end justify-between gap-4">
          <span className="text-base font-semibold text-neutral-900">Total</span>
          <div className="text-right">
            <span className="text-xs font-semibold text-neutral-500">PKR</span>
            <span className="ml-1.5 text-lg font-semibold tabular-nums text-neutral-900">
              {formatPkr(total)}
            </span>
          </div>
        </div>
        <p className="mt-1 text-right text-xs text-neutral-500">Including Rs 0.00 in taxes</p>
      </div>
    </div>
  );
}

export function CheckoutOrderSummaryAccordion({
  id,
  expanded,
  onToggle,
  lines,
  subtotal,
  shipping,
  total,
  discountCode,
  onDiscountCodeChange,
  onApplyDiscount,
  discountApplied,
  discountNotice,
}: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 bg-neutral-100 px-4 py-3.5 text-left transition hover:bg-neutral-200/80"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          Order summary
          <motion.span
            aria-hidden
            className="inline-flex h-4 w-4 shrink-0 text-neutral-600"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: easeCheckout }}
          >
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 7.5 L10 12.5 L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-neutral-900">{formatPkr(total)}</span>
      </button>

      <motion.div
        id={`${id}-panel`}
        role="region"
        aria-label="Order summary details"
        aria-hidden={!expanded}
        initial={false}
        animate={{ height: expanded ? "auto" : 0 }}
        transition={{ duration: 0.38, ease: easeCheckout }}
        className="overflow-hidden"
      >
        <CheckoutOrderSummaryBody
          lines={lines}
          subtotal={subtotal}
          shipping={shipping}
          total={total}
          discountCode={discountCode}
          onDiscountCodeChange={onDiscountCodeChange}
          onApplyDiscount={onApplyDiscount}
          discountApplied={discountApplied}
          discountNotice={discountNotice}
          inert={!expanded}
        />
      </motion.div>
    </div>
  );
}

export function CheckoutOrderSummaryPanel(props: Omit<SummaryBodyProps, "inert">) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white md:rounded-none md:border-0 md:bg-transparent"
      aria-label="Order summary"
    >
      <div className="flex items-center justify-between gap-3 bg-neutral-100 px-4 py-3.5 md:hidden">
        <span className="text-sm font-semibold text-neutral-900">Order summary</span>
        <span className="text-sm font-semibold tabular-nums text-neutral-900">
          {formatPkr(props.total)}
        </span>
      </div>
      <CheckoutOrderSummaryBody {...props} />
    </section>
  );
}

export function CheckoutPolicyFooterLinks() {
  return (
    <div className="border-t border-neutral-200 pt-6">
      <nav
        className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-xs text-neutral-600 sm:gap-x-6"
        aria-label="Policies"
      >
        <Link href="/policies/returns" className="underline underline-offset-2 hover:text-neutral-900">
          Refund policy
        </Link>
        <Link href="/policies/shipping" className="underline underline-offset-2 hover:text-neutral-900">
          Shipping
        </Link>
        <Link href="/policies/privacy" className="underline underline-offset-2 hover:text-neutral-900">
          Privacy policy
        </Link>
        <Link href="/policies/terms" className="underline underline-offset-2 hover:text-neutral-900">
          Terms of service
        </Link>
      </nav>
    </div>
  );
}
