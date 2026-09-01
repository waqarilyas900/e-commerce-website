import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const h: Record<string, string> = {};
  // Public catalog health — safe to allow admin panel origins without extra env config.
  if (origin) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    h["Access-Control-Allow-Headers"] = "authorization, content-type";
    h["Vary"] = "Origin";
  }
  return h;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: Request) {
  const cors = corsHeaders(req);
  const origin = getPublicSiteUrl();
  const feedUrl = `${origin}/feeds/google-merchant.txt`;

  try {
    const res = await fetch(feedUrl, {
      cache: "no-store",
      headers: { Accept: "text/tab-separated-values, text/plain, */*" },
    });
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rowCount = Math.max(0, lines.length - 1);

    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        rowCount,
        feedUrl,
        checkedAt: new Date().toISOString(),
      },
      { status: res.ok ? 200 : 502, headers: cors },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Feed health check failed";
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        rowCount: 0,
        feedUrl,
        checkedAt: new Date().toISOString(),
        error: message,
      },
      { status: 502, headers: cors },
    );
  }
}
