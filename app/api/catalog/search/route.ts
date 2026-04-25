import { NextResponse } from "next/server";
import { dbSearchProducts } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_Q_LEN = 200;

/** JSON search for the storefront search page (client-driven loading + skeleton). */
export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`catalog-search:${ip}`, 90, 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  if (!hasCatalogDb()) {
    return NextResponse.json({ error: "Catalog unavailable." }, { status: 503 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length > MAX_Q_LEN) {
    return NextResponse.json({ error: "Query is too long." }, { status: 400 });
  }

  const products = q.length === 0 ? [] : await dbSearchProducts(q);
  return NextResponse.json({ products });
}
