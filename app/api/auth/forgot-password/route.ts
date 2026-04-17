import { NextResponse } from "next/server";
import { generateOpaqueResetTokenRaw, hashOpaqueResetToken } from "@/lib/auth/opaque-reset-token";
import { PASSWORD_RESET_LINK_VALID_MINUTES } from "@/lib/auth/password-reset";
import { sendForgotPasswordEmail } from "@/lib/email/send-forgot-password-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const origin = req.headers.get("origin");
  if (!origin || !/^https?:\/\//i.test(origin)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request. Please try again from this site." },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server configuration error. Please try again later." },
      { status: 500 },
    );
  }

  const { data: exists, error: rpcErr } = await admin.rpc("auth_email_registered_for_reset", {
    check_email: email,
  });

  if (rpcErr) {
    console.error("[api/auth/forgot-password] rpc", rpcErr);
    return NextResponse.json(
      { ok: false, error: "Unable to verify your email. Please try again in a moment." },
      { status: 500 },
    );
  }

  if (!exists) {
    /** Same response as success — do not reveal whether the email is registered. */
    return NextResponse.json({ ok: true });
  }

  const { data: authUserId, error: uidErr } = await admin.rpc("auth_user_id_by_email", {
    check_email: email,
  });

  if (uidErr) {
    console.error("[api/auth/forgot-password] auth_user_id_by_email", uidErr);
    return NextResponse.json(
      { ok: false, error: "Unable to prepare reset. Please try again." },
      { status: 500 },
    );
  }

  if (authUserId == null) {
    return NextResponse.json({ ok: true });
  }

  const { error: delErr } = await admin
    .from("password_reset_tokens")
    .delete()
    .eq("auth_user_id", authUserId)
    .is("used_at", null);

  if (delErr) {
    console.error("[api/auth/forgot-password] delete pending tokens", delErr);
    return NextResponse.json({ ok: false, error: "Unable to create reset link." }, { status: 500 });
  }

  const raw = generateOpaqueResetTokenRaw();
  const tokenSha = hashOpaqueResetToken(raw);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_LINK_VALID_MINUTES * 60 * 1000,
  ).toISOString();

  const { error: insErr } = await admin.from("password_reset_tokens").insert({
    token_sha256: tokenSha,
    auth_user_id: authUserId,
    expires_at: expiresAt,
  });

  if (insErr) {
    console.error("[api/auth/forgot-password] insert token", insErr);
    return NextResponse.json({ ok: false, error: "Could not create reset link. Try again." }, { status: 500 });
  }

  const resetUrl = `${origin}/reset-password?t=${encodeURIComponent(raw)}`;

  const sendResult = await sendForgotPasswordEmail({
    to: email,
    resetUrl,
  });

  if (!sendResult.sent) {
    return NextResponse.json(
      { ok: false, error: sendResult.error ?? "Could not send reset email. Please try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
