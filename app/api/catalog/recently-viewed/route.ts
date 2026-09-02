import { NextResponse } from "next/server";
import { getCachedProductsBySlugs } from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MAX_SLUGS = 12;

/** Resolve recently viewed slugs (from localStorage) to active product cards. */
export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`recently-viewed:${ip}`, 120, 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  if (!hasCatalogDb()) {
    return NextResponse.json([]);
  }

  const raw = new URL(req.url).searchParams.get("slugs")?.trim() ?? "";
  const slugs = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_SLUGS);

  if (slugs.length === 0) {
    return NextResponse.json([]);
  }

  const rows = await getCachedProductsBySlugs(slugs);
  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  const ordered = slugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const responseProducts = ordered.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.image,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    defaultVariantId: p.defaultVariantId,
    defaultVariantSku: p.defaultVariantSku,
    inStock: p.inStock,
  }));

  return NextResponse.json(responseProducts, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
