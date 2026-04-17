import { NextResponse } from "next/server";
import { formatPkr } from "@/app/lib/format-currency";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/email/send-order-confirmation";
import type { OrderLineSummary } from "@/lib/email/send-order-confirmation";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export type PlaceOrderPayload = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  shipping_street: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  /** ISO 3166-1 alpha-2; storefront sends PK only. */
  shipping_country?: string;
  customer_note?: string;
  currency?: string;
  items: { variant_id: string; quantity: number }[];
};

export type PlaceOrderResult =
  | { ok: true; order_id: string; order_number: string; total_cents: number }
  | { ok: false; error: string };

function productNameFromJoin(products: unknown): string {
  if (products && typeof products === "object" && !Array.isArray(products) && "name" in products) {
    return String((products as { name: string }).name);
  }
  if (Array.isArray(products) && products[0] && typeof products[0] === "object" && products[0] !== null) {
    const n = (products[0] as { name?: string }).name;
    if (n) return n;
  }
  return "Product";
}

async function buildOrderLineSummaries(
  items: { variant_id: string; quantity: number }[],
): Promise<OrderLineSummary[]> {
  const variantIds = [...new Set(items.map((i) => i.variant_id))];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, price, products(name)")
    .in("id", variantIds);

  if (error || !data?.length) {
    return items.map((i) => ({
      name: "Product",
      quantity: i.quantity,
      lineTotalLabel: "—",
    }));
  }

  const byId = new Map(
    (
      data as { id: string; price: unknown; products: unknown }[]
    ).map((row) => [
      row.id,
      {
        name: productNameFromJoin(row.products),
        price: Number(row.price ?? 0),
      },
    ]),
  );

  return items.map((i) => {
    const row = byId.get(i.variant_id);
    const unit = row?.price ?? 0;
    const lineTotal = unit * i.quantity;
    return {
      name: row?.name ?? "Product",
      quantity: i.quantity,
      lineTotalLabel: formatPkr(lineTotal),
    };
  });
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`place-order:${ip}`, 25, 15 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = body as PlaceOrderPayload;
  if (!incoming?.items?.length) {
    return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
  }

  const rpcPayload: PlaceOrderPayload = {
    email: incoming.email,
    first_name: incoming.first_name,
    last_name: incoming.last_name,
    phone: incoming.phone,
    shipping_street: incoming.shipping_street,
    shipping_city: incoming.shipping_city,
    shipping_postal_code: incoming.shipping_postal_code,
    shipping_province: incoming.shipping_province,
    shipping_country: incoming.shipping_country ?? "PK",
    customer_note: incoming.customer_note,
    currency: incoming.currency,
    items: incoming.items,
  };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_payload: rpcPayload as unknown as Record<string, unknown>,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Order failed" } satisfies PlaceOrderResult,
      { status: 400 },
    );
  }

  const result = data as PlaceOrderResult | null;
  if (!result || typeof result !== "object") {
    return NextResponse.json(
      { ok: false, error: "Unexpected response" } satisfies PlaceOrderResult,
      { status: 502 },
    );
  }

  if ("ok" in result && result.ok === false) {
    return NextResponse.json(result, { status: 400 });
  }

  if ("ok" in result && result.ok === true) {
    void (async () => {
      try {
        const lines = await buildOrderLineSummaries(rpcPayload.items);
        const shippingSummary = [
          rpcPayload.shipping_street,
          `${rpcPayload.shipping_city}, ${rpcPayload.shipping_postal_code}`,
          rpcPayload.shipping_province,
        ].join("\n");
        const customerName =
          `${rpcPayload.first_name} ${rpcPayload.last_name}`.trim() || "Customer";
        const sendResult = await sendOrderConfirmationEmail({
          to: rpcPayload.email.trim(),
          orderNumber: result.order_number,
          totalLabel: formatPkr(result.total_cents / 100),
          customerName,
          lines,
          shippingSummary,
        });
        if (!sendResult.sent) {
          console.warn("[orders/place] confirmation email:", sendResult.error);
        }
      } catch (e) {
        console.warn("[orders/place] confirmation email failed", e);
      }
    })();

    return NextResponse.json(result);
  }

  return NextResponse.json(
    { ok: false, error: "Unexpected response" } satisfies PlaceOrderResult,
    { status: 502 },
  );
}
