import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPkr } from "@/app/lib/format-currency";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  total_cents: number;
  created_at: string;
  order_items: { id: string }[] | null;
};

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/account/orders");
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, created_at, order_items(id)")
    .order("created_at", { ascending: false });

  const list = (orders ?? []) as OrderRow[];

  return (
    <div className="w-full">
      <header className="border-b border-neutral-200/90 pb-8">
        <p className="text-xs font-semibold capitalize tracking-wide text-neutral-500">
          <Link href="/account" className="hover:underline">
            Account
          </Link>{" "}
          / Order history
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">Your orders</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Track deliveries and open any order for line items, payment, and shipping details.
        </p>
      </header>

      {error ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load orders. Please try again later.
        </p>
      ) : list.length === 0 ? (
        <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50 to-white shadow-sm ring-1 ring-neutral-950/[0.04]">
          <div className="px-6 py-16 text-center sm:px-10 sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/80">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-neutral-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="mt-5 text-base font-semibold text-neutral-900">No orders yet</p>
            <p className="mt-2 text-sm text-neutral-600">
              When you check out while signed in, your orders will appear in this list.
            </p>
            <Link
              href="/collections"
              className="mt-8 inline-flex rounded-full bg-neutral-950 px-8 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Start shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10 w-full">
          {/* Table-style list: matches storefront max-w-7xl container */}
          <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-neutral-950/[0.04]">
            <div className="hidden border-b border-neutral-200 bg-neutral-50/95 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-4 lg:px-8">
              <div className="lg:col-span-4">
                <span className="text-[11px] font-semibold capitalize tracking-wider text-neutral-500">
                  Order
                </span>
              </div>
              <div className="lg:col-span-3">
                <span className="text-[11px] font-semibold capitalize tracking-wider text-neutral-500">
                  Date
                </span>
              </div>
              <div className="lg:col-span-3">
                <span className="text-[11px] font-semibold capitalize tracking-wider text-neutral-500">
                  Status
                </span>
              </div>
              <div className="text-right lg:col-span-2">
                <span className="text-[11px] font-semibold capitalize tracking-wider text-neutral-500">
                  Total
                </span>
              </div>
            </div>

            <ul className="divide-y divide-neutral-200">
              {list.map((o) => {
                const ref = o.order_number ?? o.id.slice(0, 8).toUpperCase();
                const when = new Date(o.created_at);
                const dateStr = when.toLocaleDateString("en-PK", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const totalRupees = o.total_cents / 100;
                const itemCount = o.order_items?.length ?? 0;

                return (
                  <li key={o.id}>
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="group flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-neutral-50/90 sm:px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-4 lg:px-8 lg:py-5"
                    >
                      <div className="min-w-0 lg:col-span-4">
                        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start lg:gap-1.5">
                          <span className="font-mono text-[15px] font-semibold tracking-tight text-neutral-900">
                            {ref}
                          </span>
                          <span className="text-xs text-neutral-500 lg:hidden">
                            {dateStr}
                            {itemCount > 0
                              ? ` · ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                              : ""}
                          </span>
                        </div>
                        <p className="mt-1 hidden text-xs text-neutral-500 lg:block">
                          {itemCount > 0
                            ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
                            : "—"}
                        </p>
                      </div>

                      <div className="hidden text-sm text-neutral-700 lg:col-span-3 lg:block">
                        {dateStr}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:col-span-3">
                        <OrderStatusBadge status={o.status} />
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-4 lg:col-span-2 lg:justify-end lg:border-0 lg:pt-0">
                        <div className="text-left lg:text-right">
                          <p className="text-lg font-semibold tabular-nums tracking-tight text-neutral-900">
                            {formatPkr(totalRupees)}
                          </p>
                        </div>
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition group-hover:bg-neutral-900 group-hover:text-white"
                          aria-hidden
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-6 text-center text-xs text-neutral-500">
            Questions about an order? Contact us with your order number.
          </p>
        </div>
      )}
    </div>
  );
}
