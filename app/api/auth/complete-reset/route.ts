import { NextResponse } from "next/server";
import { PASSWORD_RESET_LINK_VALID_MINUTES } from "@/lib/auth/password-reset";
import { hashOpaqueResetToken } from "@/lib/auth/opaque-reset-token";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MIN_PASSWORD = 8;

/**
 * POST { token, password } — one-time: updates password via admin API, marks token used.
 */
export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = (await req.json()) as { token?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!raw || raw.length < 32) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: `Use at least ${MIN_PASSWORD} characters.` },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ ok: false, error: "Server configuration error." }, { status: 500 });
  }

  const tokenSha = hashOpaqueResetToken(raw);

  const { data: row, error: selErr } = await admin
    .from("password_reset_tokens")
    .select("id, auth_user_id, expires_at, used_at")
    .eq("token_sha256", tokenSha)
    .maybeSingle();

  if (selErr) {
    console.error("[complete-reset] select", selErr);
    return NextResponse.json({ ok: false, error: "Unable to complete reset." }, { status: 500 });
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
      { ok: false, error: `This link expired (${PASSWORD_RESET_LINK_VALID_MINUTES} minutes). Request a new one.` },
      { status: 400 },
    );
  }

  const { error: updUserErr } = await admin.auth.admin.updateUserById(row.auth_user_id, {
    password,
  });

  if (updUserErr) {
    console.error("[complete-reset] updateUserById", updUserErr);
    return NextResponse.json(
      { ok: false, error: updUserErr.message ?? "Could not update password." },
      { status: 400 },
    );
  }

  const { error: markErr } = await admin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null);

  if (markErr) {
    console.error("[complete-reset] mark used", markErr);
    /* Password already changed — still return success but log */
  }

  return NextResponse.json({ ok: true });
}
