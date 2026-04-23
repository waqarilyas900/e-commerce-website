"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { formatPkr } from "@/app/lib/format-currency";
import type { ResolvedCartLine } from "@/app/providers/cart-provider";
import { ModalShell } from "@/components/ui/modal-shell";

const easeCheckout: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Props = {
  id: string;
  expanded: boolean;
  onToggle: () => void;
  lines: Line[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingWaiverCutoffPkr?: number | null;
  discountCode: string;
  onDiscountCodeChange: (value: string) => void;
  onApplyDiscount: () => void;
  discountApplied: boolean;
  /** When set, shown as the discount line (PKR). */
  discountPkr?: number;
  discountNotice: string | null;
  /** When true, message is styled as an error and the code field gets a red border. */
  discountNoticeIsError?: boolean;
  applyingVoucher?: boolean;
};

type Line = ResolvedCartLine;

type SummaryBodyProps = {
  lines: Line[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingWaiverCutoffPkr?: number | null;
  discountCode: string;
  onDiscountCodeChange: (value: string) => void;
  onApplyDiscount: () => void;
  discountApplied: boolean;
  discountPkr?: number;
  discountNotice: string | null;
  discountNoticeIsError?: boolean;
  applyingVoucher?: boolean;
  inert?: boolean;
};

function CheckoutOrderSummaryBody({
  lines,
  subtotal,
  shipping,
  total,
  shippingWaiverCutoffPkr = null,
  discountCode,
  onDiscountCodeChange,
  onApplyDiscount,
  discountApplied,
  discountPkr = 0,
  discountNotice,
  discountNoticeIsError = false,
  applyingVoucher = false,
  inert = false,
}: SummaryBodyProps) {
  const voucherNoticeId = useId();
  const showNotice = Boolean(discountNotice);
  const inputError = showNotice && discountNoticeIsError;
  const [shippingPolicyOpen, setShippingPolicyOpen] = useState(false);

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
          aria-invalid={inputError}
          aria-describedby={inputError ? voucherNoticeId : undefined}
          className={
            inputError
              ? "min-w-0 flex-1 rounded-md border-2 border-red-500 bg-red-50/40 px-3 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-red-900/40 focus:border-red-600 focus:ring-2 focus:ring-red-500/25"
              : "min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          }
        />
        <button
          type="button"
          onClick={onApplyDiscount}
          disabled={applyingVoucher}
          className="shrink-0 rounded-md border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {applyingVoucher ? "…" : "Apply"}
        </button>
      </div>
      {showNotice ? (
        <p
          id={voucherNoticeId}
          className={
            discountNoticeIsError
              ? "mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium leading-snug text-red-800"
              : "mt-2 text-xs text-neutral-600"
          }
          role={discountNoticeIsError ? "alert" : "status"}
        >
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
            <button
              type="button"
              onClick={() => setShippingPolicyOpen(true)}
              aria-label="View shipping policy"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-400 text-[10px] font-semibold text-neutral-600 transition hover:bg-neutral-100"
            >
              ?
            </button>
          </span>
          {shipping <= 0 ? (
            <span className="text-right">
              <span className="tabular-nums font-semibold text-emerald-700">
                {shippingWaiverCutoffPkr != null && shippingWaiverCutoffPkr > 0
                  ? `Waived (${formatPkr(shippingWaiverCutoffPkr)}+)`
                  : "Waived"}
              </span>
              <span className="block text-[11px] text-neutral-500">Not added to total</span>
            </span>
          ) : (
            <span className="tabular-nums">{formatPkr(shipping)}</span>
          )}
        </div>
        {discountApplied && discountPkr > 0 ? (
          <div className="flex justify-between gap-4 text-emerald-800">
            <span>Discount</span>
            <span className="tabular-nums font-medium">−{formatPkr(discountPkr)}</span>
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

      <ModalShell
        open={shippingPolicyOpen}
        onClose={() => setShippingPolicyOpen(false)}
        title="Shipping"
        maxWidthClassName="max-w-3xl"
        zIndexClassName="z-[220]"
      >
        <ul className="list-disc space-y-4 pl-5 text-base leading-relaxed text-neutral-900">
          <li>
            <strong>Free Shipping</strong> on all orders over the value of <strong>Rs.3000</strong>.
          </li>
          <li>
            We charge <strong>Rs.250</strong> for shipping on all orders under the value of{" "}
            <strong>Rs.3000</strong>.
          </li>
          <li>
            Orders placed by 12:00 pm (Pakistan Standard Time) will be shipped the same day via
            Registered Courier Service. Orders received after 12:00 pm will be dispatched the next
            day.
          </li>
          <li>
            Orders received on Sundays and on Pakistan&apos;s National Holidays will be processed
            and shipped on the next working day.
          </li>
          <li>
            Delivery time is between <strong>4 to 7 working days</strong> (No delivery on Sundays).
            However delivery can take up to 7 working days during the busy shopping season or our
            mega sales events.
          </li>
          <li>
            We will deliver to the home or office address indicated by you when you place an order.
          </li>
          <li>
            We cannot deliver to PO boxes. All deliveries must be signed for upon receipt. We will
            try at least twice to deliver your order at the address indicated by you.
          </li>
          <li>
            If you have any questions you can contact us at <strong>0302-2994444</strong> or email
            us at <strong>support@radstore.pk</strong>.
          </li>
        </ul>
      </ModalShell>
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
  shippingWaiverCutoffPkr,
  discountCode,
  onDiscountCodeChange,
  onApplyDiscount,
  discountApplied,
  discountPkr,
  discountNotice,
  discountNoticeIsError,
  applyingVoucher,
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
          shippingWaiverCutoffPkr={shippingWaiverCutoffPkr}
          discountCode={discountCode}
          onDiscountCodeChange={onDiscountCodeChange}
          onApplyDiscount={onApplyDiscount}
          discountApplied={discountApplied}
          discountPkr={discountPkr}
          discountNotice={discountNotice}
          discountNoticeIsError={discountNoticeIsError}
          applyingVoucher={applyingVoucher}
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
