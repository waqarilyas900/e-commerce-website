import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

/** In-memory limiter (per server instance). Sufficient to blunt casual abuse; use Redis/Upstash for strict global limits. */
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 8000;

function pruneIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(k);
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

/**
 * Fixed window: at most `max` requests per `windowMs` for `key`.
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  pruneIfNeeded();
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return { ok: true };
  }
  if (b.count < max) {
    b.count += 1;
    return { ok: true };
  }
  return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
}

export function getRequestIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitResponse(retryAfterMs: number, message = "Too many requests. Try again later.") {
  const sec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { ok: false, error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(sec),
      },
    },
  );
}
