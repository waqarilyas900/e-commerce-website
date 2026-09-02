"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ProfilePhoneField } from "@/components/account/profile-phone-field";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { formatPkr } from "@/app/lib/format-currency";
import { formatOrderStatusLabel } from "@/app/lib/orders-display";
import type { TrackOrderResponse } from "@/app/api/orders/track/route";

function TrackOrderInner() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(
    () => searchParams.get("order")?.trim() ?? "",
  );
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<TrackOrderResponse, { ok: true }> | null>(
    null,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: orderNumber, phone }),
      });
      const data = (await res.json()) as TrackOrderResponse;
      if (!data.ok) {
        setError(data.error ?? "Order not found.");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not look up your order. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <header className="border-b border-neutral-200/90 pb-8">
        <p className="text-xs font-normal capitalize tracking-wide text-neutral-500">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          / Track order
        </p>
        <h1 className="mt-2 text-[1.50rem] font-normal tracking-tight text-neutral-900 sm:text-3xl">
          Track your order
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600">
          Enter the order number from your confirmation (e.g.{" "}
          <span className="font-mono text-neutral-800">ORD-20260303-1234</span>) and the
          phone number you used at checkout.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="track-order-number" className="mb-1.5 block text-sm font-medium text-neutral-900">
            Order number
          </label>
          <input
            id="track-order-number"
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-mono text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15"
            placeholder="ORD-20260303-1234"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="track-phone" className="mb-1.5 block text-sm font-medium text-neutral-900">
            Phone used at checkout
          </label>
          <ProfilePhoneField
            id="track-phone"
            value={phone}
            lockCountry
            onChange={setPhone}
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="btn w-full rounded-none bg-neutral-950 text-white disabled:opacity-60 sm:w-auto sm:min-w-[12rem]"
        >
          {loading ? "Looking up…" : "Track order"}
        </button>
      </form>

      {result ? (
        <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-neutral-950/[0.04]">
          <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Order
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-neutral-900">
                  {result.order.order_number}
                </p>
              </div>
              <OrderStatusBadge status={result.order.status} />
            </div>
            <p className="mt-3 text-sm text-neutral-600">
              Placed{" "}
              {new Date(result.order.created_at).toLocaleDateString("en-PK", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              {result.order.shipping_city}
              {result.order.shipping_province
                ? `, ${result.order.shipping_province}`
                : ""}
            </p>
          </div>

          <div className="divide-y divide-neutral-100 px-5 sm:px-6">
            <div className="py-4">
              <p className="text-sm font-medium text-neutral-900">Items</p>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700">
                {result.order.items.map((item, idx) => (
                  <li key={`${item.name}-${idx}`} className="flex justify-between gap-3">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatPkr(item.line_total_cents / 100)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between border-t border-neutral-100 pt-3 text-sm font-semibold text-neutral-900">
                <span>Total (COD)</span>
                <span className="tabular-nums">{formatPkr(result.order.total_cents / 100)}</span>
              </p>
            </div>

            {result.order.history.length > 0 ? (
              <div className="py-4">
                <p className="text-sm font-medium text-neutral-900">Status updates</p>
                <ol className="mt-3 space-y-3">
                  {result.order.history.map((h, idx) => (
                    <li key={`${h.status}-${h.created_at}-${idx}`} className="flex gap-3 text-sm">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-neutral-400" aria-hidden />
                      <div>
                        <p className="font-medium text-neutral-900">
                          {formatOrderStatusLabel(h.status)}
                        </p>
                        {h.note ? (
                          <p className="mt-0.5 text-neutral-600">{h.note}</p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {new Date(h.created_at).toLocaleString("en-PK", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-sm text-neutral-600">
        Have an account?{" "}
        <Link href="/account/orders" className="font-medium text-neutral-900 underline">
          View order history
        </Link>
      </p>
    </div>
  );
}

export function TrackOrderPageClient() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-sm text-neutral-600">Loading track order…</div>
      }
    >
      <TrackOrderInner />
    </Suspense>
  );
}
