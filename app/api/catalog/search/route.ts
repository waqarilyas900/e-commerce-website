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

  const limitRaw = new URL(req.url).searchParams.get("limit");
  const limit = limitRaw == null ? undefined : Number(limitRaw);
  const products = q.length === 0 ? [] : await dbSearchProducts(q, limit);
  const responseProducts = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.image,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    collection: p.collection,
    rating: p.rating,
    reviews: p.reviews,
    defaultVariantId: p.defaultVariantId,
    inStock: p.inStock,
  }));
  return NextResponse.json(
    { products: responseProducts },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
