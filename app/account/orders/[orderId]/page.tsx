import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPkr, STORE_CURRENCY_CODE } from "@/app/lib/format-currency";
import {
  firstProductImage,
  formatOptionSnapshot,
  formatPaymentMethodLabel,
  formatOrderStatusLabel,
} from "@/app/lib/orders-display";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProductRow = { slug: string; name: string; images: unknown };
type VariantRow = {
  id: string;
  option_values: Record<string, unknown> | null;
  products: ProductRow | null;
};
type ItemRow = {
  id: string;
  product_variant_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_cents: number;
  quantity: number;
  option_values_snapshot: Record<string, unknown>;
  product_variants: VariantRow | VariantRow[] | null;
};
type HistoryRow = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};
type OrderDetail = {
  id: string;
  order_number: string | null;
  status: string;
  email: string;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_method: string;
  first_name: string;
  last_name: string;
  phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  customer_note: string;
  created_at: string;
  order_items: ItemRow[] | null;
  order_status_history: HistoryRow[] | null;
};

function normalizeVariant(
  v: VariantRow | VariantRow[] | null | undefined,
): VariantRow | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!UUID_RE.test(orderId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/account/orders/${orderId}`);
  }

  const { data: raw, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      status,
      email,
      subtotal_cents,
      shipping_cents,
      discount_cents,
      total_cents,
      payment_method,
      first_name,
      last_name,
      phone,
      shipping_street,
      shipping_city,
      shipping_postal_code,
      shipping_province,
      customer_note,
      created_at,
      order_items (
        id,
        product_variant_id,
        product_name_snapshot,
        sku_snapshot,
        unit_price_cents,
        quantity,
        option_values_snapshot,
        product_variants (
          id,
          option_values,
          products (
            slug,
            name,
            images
          )
        )
      ),
      order_status_history (
        id,
        status,
        note,
        created_at
      )
    `,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !raw) {
    notFound();
  }

  const order = raw as unknown as OrderDetail;
  const items = [...(order.order_items ?? [])].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const timeline = [...(order.order_status_history ?? [])].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const ref = order.order_number ?? order.id.slice(0, 13).toUpperCase();
  const placed = new Date(order.created_at);
  const dateStr = placed.toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = placed.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Link href="/account" className="hover:underline">
          Account
        </Link>{" "}
        /{" "}
        <Link href="/account/orders" className="hover:underline">
          Orders
        </Link>{" "}
        / <span className="text-neutral-400">{ref}</span>
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-neutral-950/[0.04]">
        <div className="border-b border-neutral-200 bg-neutral-50/95 px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Order detail
              </p>
              <h1 className="mt-1 font-mono text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                {ref}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Placed on {dateStr} · {timeStr}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-800 ring-1 ring-inset ring-neutral-200/90">
                {formatPaymentMethodLabel(order.payment_method)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-8 sm:px-8 lg:col-span-8 lg:border-b-0 lg:border-r lg:border-neutral-200 lg:px-10 lg:py-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Items
          </h2>
          {items.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
              No line items are recorded for this order.
            </p>
          ) : (
          <ul className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200/80 bg-neutral-50/40">
            {items.map((line) => {
              const variant = normalizeVariant(line.product_variants);
              const product = variant?.products ?? null;
              const imgUrl = firstProductImage(product?.images);
              const optsFromSnap = formatOptionSnapshot(line.option_values_snapshot);
              const optsFromVariant = formatOptionSnapshot(variant?.option_values);
              const optionsLine =
                optsFromSnap || optsFromVariant || null;
              const unitRupees = line.unit_price_cents / 100;
              const lineTotal = unitRupees * line.quantity;
              const productHref = product?.slug
                ? `/products/${product.slug}`
                : null;

              return (
                <li key={line.id} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200/60 sm:h-28 sm:w-28">
                    {imgUrl ? (
                      imgUrl.startsWith("/") ? (
                        <Image
                          src={imgUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- remote storage URLs may not be in next.config
                        <img
                          src={imgUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        {productHref ? (
                          <Link
                            href={productHref}
                            className="font-semibold text-neutral-900 underline-offset-2 hover:underline"
                          >
                            {line.product_name_snapshot}
                          </Link>
                        ) : (
                          <p className="font-semibold text-neutral-900">
                            {line.product_name_snapshot}
                          </p>
                        )}
                        {optionsLine ? (
                          <p className="mt-1 text-sm text-neutral-600">{optionsLine}</p>
                        ) : null}
                        <p className="mt-1 font-mono text-xs text-neutral-500">
                          SKU {line.sku_snapshot}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-900">
                          {formatPkr(lineTotal)}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {formatPkr(unitRupees)} × {line.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          )}

          {order.customer_note.trim() ? (
            <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">Your note: </span>
              {order.customer_note.trim()}
            </div>
          ) : null}
          </div>

        <div className="space-y-8 bg-neutral-50/40 px-5 py-8 sm:px-8 lg:col-span-4 lg:px-10 lg:py-10">
          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Summary
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Subtotal</dt>
                <dd className="font-medium text-neutral-900">
                  {formatPkr(order.subtotal_cents / 100)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Delivery</dt>
                <dd className="font-medium text-neutral-900">
                  {formatPkr(order.shipping_cents / 100)}
                </dd>
              </div>
              {order.discount_cents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-600">Discount</dt>
                  <dd className="font-medium text-emerald-700">
                    −{formatPkr(order.discount_cents / 100)}
                  </dd>
                </div>
              ) : null}
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex justify-between gap-4 text-base">
                  <dt className="font-semibold text-neutral-900">Total</dt>
                  <dd className="font-semibold text-neutral-900">
                    {formatPkr(order.total_cents / 100)}
                    <span className="ml-1.5 text-xs font-normal text-neutral-500">
                      {STORE_CURRENCY_CODE}
                    </span>
                  </dd>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  {formatPaymentMethodLabel(order.payment_method)} — pay when your order arrives.
                </p>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Delivery
            </h2>
            <div className="mt-3 text-sm text-neutral-800">
              <p className="font-medium text-neutral-900">
                {order.first_name} {order.last_name}
              </p>
              <p className="mt-1 text-neutral-600">{order.email}</p>
              <p className="mt-2 text-neutral-600">{order.phone}</p>
              <address className="mt-3 not-italic leading-relaxed text-neutral-600">
                {order.shipping_street}
                <br />
                {order.shipping_city}
                {order.shipping_postal_code ? `, ${order.shipping_postal_code}` : ""}
                <br />
                {order.shipping_province}
              </address>
            </div>
          </div>

          {timeline.length > 0 ? (
            <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Status updates
              </h2>
              <ol className="mt-4 space-y-4 border-l border-neutral-200 pl-4">
                {timeline.map((h) => {
                  const t = new Date(h.created_at);
                  return (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-neutral-900 ring-4 ring-white" />
                      <p className="text-xs text-neutral-500">
                        {t.toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-neutral-900">
                        {formatOrderStatusLabel(h.status)}
                      </p>
                      {h.note ? (
                        <p className="mt-0.5 text-sm text-neutral-600">{h.note}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 underline-offset-4 hover:underline"
        >
          ← Back to order history
        </Link>
      </div>
    </div>
  );
}
