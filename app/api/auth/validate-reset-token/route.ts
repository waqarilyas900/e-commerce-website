import { NextResponse } from "next/server";
import { hashOpaqueResetToken } from "@/lib/auth/opaque-reset-token";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST { token: string } — checks token exists, not used, not expired.
 * Does not consume the token (use complete-reset for that).
 */
export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`validate-reset:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.token === "string" ? body.token.trim() : "";
  if (!raw || raw.length < 32) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 400 });
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ ok: false, error: "Server configuration error." }, { status: 500 });
  }

  const tokenSha = hashOpaqueResetToken(raw);
  const { data: row, error } = await admin
    .from("password_reset_tokens")
    .select("id, expires_at, used_at")
    .eq("token_sha256", tokenSha)
    .maybeSingle();

  if (error) {
    console.error("[validate-reset-token]", error);
    return NextResponse.json({ ok: false, error: "Unable to verify token." }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ ok: false, error: "Invalid or unknown reset link." }, { status: 400 });
  }

  if (row.used_at) {
    return NextResponse.json(
      { ok: false, error: "This reset link was already used. Request a new one." },
      { status: 400 },
    );
  }

  const expires = new Date(row.expires_at).getTime();
  if (Number.isNaN(expires) || expires < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "This reset link has expired. Request a new one." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
