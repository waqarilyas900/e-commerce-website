import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { wrapNewsletterBroadcastHtml } from "@/lib/email/newsletter-broadcast-html";
import { getResend, getResendFrom } from "@/lib/email/resend-client";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_SUBJECT = 220;
const MAX_HTML = 600_000;
const MAX_RECIPIENTS = 2000;
const SEND_DELAY_MS = 350;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = (process.env.ADMIN_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const h: Record<string, string> = {};
  if (origin && allowed.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "authorization, content-type";
    h["Vary"] = "Origin";
  }
  return h;
}

function createUserSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

type SubRow = {
  id: string;
  email: string;
  unsubscribe_token: string;
  resubscribe_token: string;
};

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req);
  const ip = getRequestIp(req);
  const limited = rateLimit(`admin-newsletter-send:${ip}`, 8, 60 * 60 * 1000);
  if (!limited.ok) {
    const r = rateLimitResponse(limited.retryAfterMs, "Too many send attempts. Try again later.");
    const merged = new Headers(r.headers);
    for (const [k, v] of Object.entries(cors)) merged.set(k, v);
    return new NextResponse(r.body, { status: r.status, headers: merged });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { ok: false, error: "Missing Authorization: Bearer <access_token>" },
      { status: 401, headers: cors },
    );
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Empty token" }, { status: 401, headers: cors });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: cors });
  }

  const subject =
    typeof body === "object" &&
    body !== null &&
    "subject" in body &&
    typeof (body as { subject: unknown }).subject === "string"
      ? (body as { subject: string }).subject.trim()
      : "";
  const html =
    typeof body === "object" &&
    body !== null &&
    "html" in body &&
    typeof (body as { html: unknown }).html === "string"
      ? (body as { html: string }).html
      : "";

  if (!subject || subject.length > MAX_SUBJECT) {
    return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400, headers: cors });
  }
  if (!html || html.length > MAX_HTML) {
    return NextResponse.json({ ok: false, error: "Invalid html" }, { status: 400, headers: cors });
  }

  const resend = getResend();
  const from = getResendFrom();
  if (!resend || !from) {
    return NextResponse.json(
      { ok: false, error: "Email not configured (RESEND_API_KEY / RESEND_FROM)" },
      { status: 503, headers: cors },
    );
  }

  let userSb: ReturnType<typeof createUserSupabase>;
  try {
    userSb = createUserSupabase(accessToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Config error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500, headers: cors });
  }

  const {
    data: { user },
    error: userErr,
  } = await userSb.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401, headers: cors });
  }

  const { data: adminRow, error: adminErr } = await userSb
    .from("admins")
    .select("status")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (adminErr || !adminRow || adminRow.status !== "active") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: cors });
  }

  const { data: rows, error: listErr } = await userSb
    .from("newsletter_subscriptions")
    .select("id, email, unsubscribe_token, resubscribe_token")
    .eq("subscribed", true)
    .limit(MAX_RECIPIENTS);

  if (listErr) {
    return NextResponse.json(
      { ok: false, error: listErr.message || "Could not load subscribers" },
      { status: 502, headers: cors },
    );
  }

  const list = (rows ?? []) as SubRow[];

  const { data: campRow, error: campInsertErr } = await userSb
    .from("newsletter_campaigns")
    .insert({
      subject,
      body_html: html,
      recipient_count: list.length,
      sent_ok: 0,
      sent_failed: 0,
      completed_at: null,
      created_by_auth_id: user.id,
    })
    .select("id")
    .single();

  if (campInsertErr || !campRow?.id) {
    return NextResponse.json(
      { ok: false, error: campInsertErr?.message ?? "Could not create campaign record" },
      { status: 502, headers: cors },
    );
  }

  const campaignId = campRow.id as string;

  let sentOk = 0;
  let sentFailed = 0;
  const errors: string[] = [];

  for (const row of list) {
    const to = row.email?.trim();
    if (!to || !row.unsubscribe_token || !row.resubscribe_token) {
      sentFailed += 1;
      const { error: recErr } = await userSb.from("newsletter_campaign_recipients").insert({
        campaign_id: campaignId,
        email: to || "(invalid)",
        subscription_id: row.id,
        status: "failed",
        error_message: "Missing email or compliance tokens",
      });
      if (recErr) console.warn("[admin/newsletter/send] recipient log:", recErr.message);
      continue;
    }
    const fullHtml = wrapNewsletterBroadcastHtml(html, {
      unsubscribeToken: row.unsubscribe_token,
      resubscribeToken: row.resubscribe_token,
    });
    const { error: sendErr } = await resend.emails.send({
      from,
      to,
      subject,
      html: fullHtml,
    });
    if (sendErr) {
      sentFailed += 1;
      if (errors.length < 8) errors.push(`${to}: ${sendErr.message}`);
    } else {
      sentOk += 1;
    }
    const { error: recErr } = await userSb.from("newsletter_campaign_recipients").insert({
      campaign_id: campaignId,
      email: to,
      subscription_id: row.id,
      status: sendErr ? "failed" : "sent",
      error_message: sendErr?.message ?? null,
    });
    if (recErr) console.warn("[admin/newsletter/send] recipient log:", recErr.message);
    await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
  }

  const { error: campUpdateErr } = await userSb
    .from("newsletter_campaigns")
    .update({
      sent_ok: sentOk,
      sent_failed: sentFailed,
      recipient_count: list.length,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (campUpdateErr) {
    console.warn("[admin/newsletter/send] campaign finalize:", campUpdateErr.message);
  }

  return NextResponse.json(
    {
      ok: true,
      recipient_count: list.length,
      sent_ok: sentOk,
      sent_failed: sentFailed,
      sample_errors: errors,
    },
    { headers: cors },
  );
}
