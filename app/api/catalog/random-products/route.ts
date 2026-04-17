import { NextResponse } from "next/server";
import { dbListAllActiveProductsForCards } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function shufflePick<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/** Random active products for cart recommendations (JSON). */
export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`random-products:${ip}`, 120, 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  if (!hasCatalogDb()) {
    return NextResponse.json([]);
  }
  const limitRaw = new URL(req.url).searchParams.get("limit");
  const limit = Math.min(12, Math.max(1, Number(limitRaw) || 2));
  const all = await dbListAllActiveProductsForCards();
  return NextResponse.json(shufflePick(all, limit));
}
