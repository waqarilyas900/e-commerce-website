/**
 * POST /api/revalidate
 *
 * Called by the admin panel after content edits so changed pages refresh
 * without waiting for ISR TTL.
 *
 * Auth model — accept ONE of:
 *   1. Header `x-revalidate-secret` matching `REVALIDATE_SECRET` env var
 *      (server-only; never expose to the browser).
 *   2. `Authorization: Bearer <jwt>` from a Supabase user who has an active
 *      row in `public.admins`. Allows the admin panel to call this endpoint
 *      without baking a secret into the browser bundle.
 *   - Per-IP rate limit on top in case credentials leak.
 *
 * Cross-origin (browser): admin origin must be listed in `REVALIDATE_CORS_ORIGINS`
 * (comma-separated exact origins, e.g. https://admin.example.com,http://localhost:5173).
 *
 * Body shape (any combination):
 *   {
 *     paths?:        string[]   // explicit pathnames, e.g. "/products/foo"
 *     productSlug?:  string     // refreshes /products/<slug> + parent collection
 *     collectionSlug?: string   // refreshes /collections/<slug>
 *     policySlug?:   string     // refreshes /<slug> and /policies/<slug>
 *     homeSectionSlug?: string  // refreshes /s/<slug>
 *     all?:          boolean    // refreshes site-wide layout + sitemap
 *     tag?:          string     // revalidateTag for cached fetches
 *   }
 */

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

function parseCorsAllowlist(): string[] {
  const raw = process.env.REVALIDATE_CORS_ORIGINS?.trim();
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

/** Headers to allow browser `fetch` from the admin app (different origin). */
function corsHeadersForRequest(req: Request): Record<string, string> | undefined {
  const origin = req.headers.get("origin");
  if (!origin) return undefined;
  const list = parseCorsAllowlist();
  if (!list.includes(origin)) return undefined;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

async function isActiveAdminJwt(jwt: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !jwt) return false;
  try {
    const sb = createSupabaseClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Verify JWT identifies a real user.
    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) return false;
    // Ask the DB whether this user is an active admin (RLS + helper function).
    const { data: ok, error: rpcErr } = await sb.rpc("is_active_admin");
    if (rpcErr) return false;
    return ok === true;
  } catch {
    return false;
  }
}

type Payload = {
  paths?: string[];
  productSlug?: string;
  collectionSlug?: string;
  policySlug?: string;
  homeSectionSlug?: string;
  all?: boolean;
  tag?: string;
};

function dedupePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of paths) {
    if (typeof raw !== "string") continue;
    const p = raw.trim();
    if (!p) continue;
    const normalized = p.startsWith("/") ? p : `/${p}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export async function OPTIONS(req: Request) {
  const c = corsHeadersForRequest(req);
  return new NextResponse(null, { status: 204, headers: c ?? undefined });
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limit = rateLimit(`revalidate:${ip}`, 60, 60_000);
  if (!limit.ok) return withCors(req, rateLimitResponse(limit.retryAfterMs));

  const secret = process.env.REVALIDATE_SECRET?.trim();
  const providedSecret = req.headers.get("x-revalidate-secret")?.trim();
  const isSecretOk = Boolean(secret) && Boolean(providedSecret) && providedSecret === secret;

  let isAdminJwt = false;
  if (!isSecretOk) {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (auth.toLowerCase().startsWith("bearer ")) {
      isAdminJwt = await isActiveAdminJwt(auth.slice(7).trim());
    }
  }

  if (!isSecretOk && !isAdminJwt) {
    if (!secret && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return withCors(
        req,
        NextResponse.json(
          { ok: false, error: "Revalidate is disabled: set REVALIDATE_SECRET or Supabase env vars." },
          { status: 503 },
        ),
      );
    }
    return withCors(req, NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }));
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return withCors(req, NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }));
  }

  const paths: string[] = [];
  if (Array.isArray(body.paths)) paths.push(...body.paths);
  if (body.productSlug?.trim()) {
    paths.push(`/products/${body.productSlug.trim()}`);
  }
  if (body.collectionSlug?.trim()) {
    paths.push(`/collections/${body.collectionSlug.trim()}`);
    paths.push("/collections");
    paths.push("/collections/sale");
  }
  if (body.policySlug?.trim()) {
    paths.push(`/${body.policySlug.trim()}`);
    paths.push(`/policies/${body.policySlug.trim()}`);
    paths.push("/policies");
  }
  if (body.homeSectionSlug?.trim()) {
    paths.push(`/s/${body.homeSectionSlug.trim()}`);
    paths.push("/");
  }
  if (body.all) {
    paths.push("/");
    paths.push("/sitemap.xml");
    paths.push("/robots.txt");
  }

  const unique = dedupePaths(paths);
  for (const p of unique) {
    try {
      revalidatePath(p);
    } catch {
      /* swallow — keep going so a typo in one path doesn't kill the rest */
    }
  }

  if (body.tag?.trim()) {
    try {
      // Next.js 16 signature: (tag, profile). 'max' clears the tag immediately.
      revalidateTag(body.tag.trim(), "max");
    } catch {
      /* swallow */
    }
  }

  return withCors(
    req,
    NextResponse.json({
      ok: true,
      revalidated: unique,
      tag: body.tag ?? null,
    }),
  );
}

export async function GET(req: Request) {
  return withCors(
    req,
    NextResponse.json(
      { ok: false, error: "Use POST" },
      { status: 405, headers: { Allow: "POST, OPTIONS" } },
    ),
  );
}
