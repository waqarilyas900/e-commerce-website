import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isValidPakistanCheckoutPhone } from "@/app/lib/validate-pakistan-phone";

export const runtime = "nodejs";

type RecentPhonePayload = {
  recent: boolean;
  order_number?: string;
  placed_at?: string;
};

/** Soft duplicate-order hint: same phone placed an order in the last 24 hours. */
export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`checkout-recent-phone:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let phone = "";
  try {
    const body = (await req.json()) as { phone?: string };
    phone = typeof body.phone === "string" ? body.phone.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!phone || !isValidPakistanCheckoutPhone(phone)) {
    return NextResponse.json<RecentPhonePayload>({ recent: false });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc("checkout_recent_phone_order", {
      p_phone: phone,
    });

    if (error) {
      console.error("[checkout/recent-phone-order]", error.message);
      return NextResponse.json<RecentPhonePayload>({ recent: false });
    }

    const row = data as {
      recent?: boolean;
      order_number?: string;
      placed_at?: string;
    } | null;

    if (!row?.recent) {
      return NextResponse.json<RecentPhonePayload>({ recent: false });
    }

    return NextResponse.json<RecentPhonePayload>({
      recent: true,
      order_number: row.order_number,
      placed_at: row.placed_at,
    });
  } catch (e) {
    console.error("[checkout/recent-phone-order]", e);
    return NextResponse.json<RecentPhonePayload>({ recent: false });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405, headers: { Allow: "POST" } });
}
