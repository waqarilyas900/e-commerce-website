import { NextResponse } from "next/server";
import {
  normalizeOrderNumberInput,
  normalizePakistanPhoneKey,
} from "@/app/lib/order-track-phone";
import { pakistanCheckoutPhoneError } from "@/app/lib/validate-pakistan-phone";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type TrackItem = {
  name: string;
  quantity: number;
  line_total_cents: number;
};

type TrackHistory = {
  status: string;
  note: string | null;
  created_at: string;
};

export type TrackOrderResponse =
  | {
      ok: true;
      order: {
        order_number: string;
        status: string;
        created_at: string;
        total_cents: number;
        shipping_city: string;
        shipping_province: string;
        items: TrackItem[];
        history: TrackHistory[];
      };
    }
  | { ok: false; error: string };

const NOT_FOUND = "We could not find an order with that number and phone.";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`track-order:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const orderNumber = normalizeOrderNumberInput(
    String((body as { order_number?: string })?.order_number ?? ""),
  );
  const phone = String((body as { phone?: string })?.phone ?? "").trim();

  if (!orderNumber) {
    return NextResponse.json(
      { ok: false, error: "Enter your order number (e.g. ORD-20260303-1234)." },
      { status: 400 },
    );
  }

  const phoneError = pakistanCheckoutPhoneError(phone);
  if (phoneError) {
    return NextResponse.json({ ok: false, error: phoneError }, { status: 400 });
  }

  const phoneKey = normalizePakistanPhoneKey(phone);
  if (!phoneKey) {
    return NextResponse.json({ ok: false, error: NOT_FOUND }, { status: 404 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        status,
        created_at,
        total_cents,
        phone,
        shipping_city,
        shipping_province,
        order_items (
          product_name_snapshot,
          quantity,
          line_subtotal_cents,
          unit_price_cents
        ),
        order_status_history (
          status,
          note,
          created_at
        )
      `,
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ ok: false, error: NOT_FOUND }, { status: 404 });
    }

    const storedKey = normalizePakistanPhoneKey(String(order.phone ?? ""));
    if (!storedKey || storedKey !== phoneKey) {
      return NextResponse.json({ ok: false, error: NOT_FOUND }, { status: 404 });
    }

    const itemsRaw = (order.order_items ?? []) as {
      product_name_snapshot: string;
      quantity: number;
      line_subtotal_cents: number | null;
      unit_price_cents: number;
    }[];

    const items: TrackItem[] = itemsRaw.map((row) => ({
      name: row.product_name_snapshot,
      quantity: row.quantity,
      line_total_cents:
        row.line_subtotal_cents ??
        Math.round(Number(row.unit_price_cents) * row.quantity),
    }));

    const historyRaw = (order.order_status_history ?? []) as TrackHistory[];
    const history = [...historyRaw].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const payload: TrackOrderResponse = {
      ok: true,
      order: {
        order_number: order.order_number ?? orderNumber,
        status: String(order.status),
        created_at: String(order.created_at),
        total_cents: Number(order.total_cents),
        shipping_city: String(order.shipping_city ?? ""),
        shipping_province: String(order.shipping_province ?? ""),
        items,
        history,
      },
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not look up your order. Try again shortly." },
      { status: 500 },
    );
  }
}
