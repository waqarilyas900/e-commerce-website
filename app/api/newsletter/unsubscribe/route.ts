import { NextResponse } from "next/server";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidToken(value: string): boolean {
  return UUID_RE.test(value.trim());
}

type UnsubscribeRpcResult = {
  ok?: boolean;
  error?: string;
  unsubscribed?: boolean;
  already_unsubscribed?: boolean;
};

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`newsletter-unsubscribe:${ip}`, 40, 10 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as { token: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";

  if (!isUuidToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });
  }

  try {
    const supabase = createAnonServerSupabase();
    const { data, error } = await supabase.rpc("newsletter_unsubscribe_by_token", {
      p_token: token,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "Unsubscribe failed" },
        { status: 502 },
      );
    }

    const parsed = data as UnsubscribeRpcResult | null;
    if (!parsed || parsed.ok !== true) {
      return NextResponse.json(
        { ok: false, error: parsed?.error ?? "Unsubscribe failed" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      unsubscribed: Boolean(parsed.unsubscribed),
      already_unsubscribed: Boolean(parsed.already_unsubscribed),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
