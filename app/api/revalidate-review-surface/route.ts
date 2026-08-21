import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAGS } from "@/lib/cache/catalog-data";
import { getRequestIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Storefront-only: no admin JWT required; see customer-reviews.tsx after insert.

/**
 * Best-effort bust for homepage trust strip + product card aggregates after a
 * new storefront review (client-side Supabase insert cannot call admin JWT revalidate).
 * Rate-limited; no secrets in the browser.
 * Optional JSON body: `{ "productSlug": "…" }` to also bust that PDP path/tag.
 */
export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const limited = rateLimit(`revalidate-review-surface:${ip}`, 40, 60 * 60 * 1000);
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterMs);
  }

  let productSlug = "";
  try {
    const text = await req.text();
    if (text.trim()) {
      const body = JSON.parse(text) as { productSlug?: string };
      productSlug = typeof body.productSlug === "string" ? body.productSlug.trim() : "";
    }
  } catch {
    /* ignore body */
  }

  try {
    revalidateTag(CATALOG_CACHE_TAGS.storeReviewAggregate, "max");
    revalidateTag(CATALOG_CACHE_TAGS.products, "max");
    revalidatePath("/");
    if (productSlug) {
      revalidateTag(CATALOG_CACHE_TAGS.product(productSlug), "max");
      revalidatePath(`/products/${productSlug}`);
    }
  } catch {
    /* never 500 — cache APIs can throw in edge cases */
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST" }, { status: 405, headers: { Allow: "POST" } });
}
