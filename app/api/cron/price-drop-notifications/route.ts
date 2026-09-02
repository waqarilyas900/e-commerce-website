import { NextResponse } from "next/server";
import { processPriceDropNotifications } from "@/lib/cron/process-price-drop-notifications";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : headerSecret?.trim();
  return token === secret;
}

/** Daily job: email wishlist customers when a variant price drops. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await processPriceDropNotifications();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Price drop cron failed";
    console.error("[cron/price-drop-notifications]", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
