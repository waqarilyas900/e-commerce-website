import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { issueReviewThankYouVoucher } from "@/lib/vouchers/issue-review-thank-you-voucher";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

function parseCorsAllowlist(): string[] {
  const raw = process.env.REVALIDATE_CORS_ORIGINS?.trim();
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

function corsHeadersForRequest(req: Request): Record<string, string> | undefined {
  const origin = req.headers.get("origin");
  if (!origin) return undefined;
  const list = parseCorsAllowlist();
  if (!list.includes(origin)) return undefined;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, x-revalidate-secret, x-csrf-token, x-requested-with",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const c = corsHeadersForRequest(req);
  if (c) {
    for (const [k, v] of Object.entries(c)) {
      res.headers.set(k, v);
    }
  }
  return res;
}

export async function OPTIONS(req: Request) {
  const c = corsHeadersForRequest(req);
  return new NextResponse(null, { status: 204, headers: c ?? undefined });
}

/** Admin-only: issue a one-time 5% voucher email when a review is approved. */
export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`review-thank-you-voucher:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return withCors(req, rateLimitResponse(limited.retryAfterMs));
  }

  const authorized = await authorizeAdminRequest(req);
  if (!authorized) {
    return withCors(req, NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }));
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return withCors(
      req,
      NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 503 }),
    );
  }

  let reviewId = "";
  try {
    const body = (await req.json()) as { reviewId?: string };
    reviewId = typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  } catch {
    return withCors(req, NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }));
  }

  if (!reviewId) {
    return withCors(req, NextResponse.json({ ok: false, error: "reviewId required" }, { status: 400 }));
  }

  try {
    const admin = createServiceRoleClient();
    const result = await issueReviewThankYouVoucher(admin, reviewId);
    if (!result.ok) {
      return withCors(req, NextResponse.json(result, { status: 500 }));
    }
    return withCors(req, NextResponse.json(result));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Voucher issue failed";
    console.error("[admin/review-thank-you-voucher]", e);
    return withCors(req, NextResponse.json({ ok: false, error: message }, { status: 500 }));
  }
}

export async function GET(req: Request) {
  return withCors(
    req,
    NextResponse.json({ ok: false, error: "Use POST" }, { status: 405, headers: { Allow: "POST, OPTIONS" } }),
  );
}
