import { NextResponse } from "next/server";
import { createAnonServerSupabase } from "@/lib/supabase/anon-server";
import { hasCatalogDb } from "@/app/lib/db/env";
import { getPublicSiteUrl } from "@/lib/site-url";
import { FALLBACK_STANDARD_DELIVERY_PAISA } from "@/lib/checkout-constants";

/**
 * Google Merchant Center primary feed (tab-delimited).
 * Submit in GMC: https://www.simplecartstore.com/feeds/google-merchant.txt
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const COLUMNS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "condition",
  "price",
  "sale_price",
  "brand",
  "gtin",
  "mpn",
  "identifier_exists",
  "material",
  "product_type",
  "canonical_link",
  "shipping",
] as const;

function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function tsvEscape(value: string): string {
  return String(value ?? "")
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\t/g, " ")
    .trim();
}

function absoluteUrl(raw: string | null | undefined, origin: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (/[\s\u0000-\u001f\u007f]/.test(t)) return null;
  try {
    if (t.startsWith("http://") || t.startsWith("https://")) {
      const u = new URL(t);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.toString();
    }
    if (t.startsWith("/")) return `${origin}${t}`;
    return `${origin}/${t}`;
  } catch {
    return null;
  }
}

function firstImages(images: unknown, origin: string, limit = 10): string[] {
  const out: string[] = [];
  if (!Array.isArray(images)) return out;
  for (const item of images) {
    let url: string | null = null;
    if (typeof item === "string") url = absoluteUrl(item, origin);
    else if (item && typeof item === "object" && typeof (item as { url?: string }).url === "string") {
      url = absoluteUrl((item as { url: string }).url, origin);
    }
    if (!url || out.includes(url)) continue;
    out.push(url);
    if (out.length >= limit) break;
  }
  return out;
}

function formatMoneyPkr(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  return `${amount.toFixed(2)} PKR`;
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  images: unknown;
  status: string;
  free_delivery?: boolean | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  option_values: Record<string, string> | null;
};

type ShopRow = {
  product_id: string;
  brand_name: string | null;
  gtin: string | null;
  mpn: string | null;
  material: string | null;
};

type InvRow = {
  product_variant_id: string;
  quantity_on_hand: number | null;
  quantity_reserved: number | null;
};

type AssetRow = {
  product_id: string;
  url: string;
  kind: string;
  sort_order: number | null;
};

export async function GET() {
  const origin = getPublicSiteUrl();

  if (!hasCatalogDb()) {
    return new NextResponse("id\ttitle\n", {
      status: 503,
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const supabase = createAnonServerSupabase();

  const [{ data: products, error: pErr }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select("id,slug,name,short_description,description,images,status,free_delivery")
      .eq("status", "active"),
    supabase
      .from("store_settings")
      .select("standard_delivery_paisa,standard_delivery_currency")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (pErr) {
    return new NextResponse(`# error: ${pErr.message}\n`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const list = (products || []) as ProductRow[];
  const ids = list.map((p) => p.id);
  if (ids.length === 0) {
    return new NextResponse(`${COLUMNS.join("\t")}\n`, {
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const [{ data: variants }, { data: shop }, { data: pc }, { data: cols }, { data: assets }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select("id,product_id,sku,price,compare_at_price,option_values")
        .in("product_id", ids),
      supabase
        .from("product_shopping_attributes")
        .select("product_id,brand_name,gtin,mpn,material")
        .in("product_id", ids),
      supabase.from("product_collections").select("product_id,collection_id").in("product_id", ids),
      supabase.from("collections").select("id,slug,name"),
      supabase
        .from("product_assets")
        .select("product_id,url,kind,sort_order")
        .in("product_id", ids)
        .eq("kind", "image")
        .order("sort_order", { ascending: true }),
    ]);

  const variantList = (variants || []) as VariantRow[];
  const variantIds = variantList.map((v) => v.id);
  const { data: inv } = variantIds.length
    ? await supabase
        .from("inventory")
        .select("product_variant_id,quantity_on_hand,quantity_reserved")
        .in("product_variant_id", variantIds)
    : { data: [] as InvRow[] };

  const invBy = new Map(
    ((inv || []) as InvRow[]).map((r) => [r.product_variant_id, r]),
  );
  const shopBy = new Map(((shop || []) as ShopRow[]).map((r) => [r.product_id, r]));
  const colById = new Map(
    ((cols || []) as Array<{ id: string; slug: string; name: string }>).map((c) => [c.id, c]),
  );
  const productTypeBy = new Map<string, string>();
  for (const row of (pc || []) as Array<{ product_id: string; collection_id: string }>) {
    if (productTypeBy.has(row.product_id)) continue;
    const c = colById.get(row.collection_id);
    if (c?.name) productTypeBy.set(row.product_id, `Home > ${c.name}`);
  }

  const assetImagesBy = new Map<string, string[]>();
  for (const a of (assets || []) as AssetRow[]) {
    const url = absoluteUrl(a.url, origin);
    if (!url) continue;
    const arr = assetImagesBy.get(a.product_id) || [];
    if (!arr.includes(url)) arr.push(url);
    assetImagesBy.set(a.product_id, arr);
  }

  const productBy = new Map(list.map((p) => [p.id, p]));
  const shippingPaisa = Math.max(
    0,
    Math.round(
      Number(
        (settings as { standard_delivery_paisa?: number } | null)?.standard_delivery_paisa ??
          FALLBACK_STANDARD_DELIVERY_PAISA,
      ),
    ),
  );
  const shippingPkr = shippingPaisa / 100;

  const lines: string[] = [COLUMNS.join("\t")];

  for (const v of variantList) {
    const p = productBy.get(v.product_id);
    if (!p) continue;
    const slug = (p.slug || "").trim();
    if (!slug) continue;

    const sku = (v.sku || "").trim() || v.id;
    const shopRow = shopBy.get(p.id);
    const gtin = (shopRow?.gtin || "").trim();
    const mpn = (shopRow?.mpn || "").trim() || sku;
    const brand = (shopRow?.brand_name || "").trim() || "SimpleCart Store";
    const material = (shopRow?.material || "").trim();

    const invRow = invBy.get(v.id);
    const stock = Math.max(
      0,
      (invRow?.quantity_on_hand ?? 0) - (invRow?.quantity_reserved ?? 0),
    );
    const availability = stock > 0 ? "in_stock" : "out_of_stock";

    const price = Number(v.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const compare = Number(v.compare_at_price);
    const onSale = Number.isFinite(compare) && compare > price;

    const link = `${origin}/products/${encodeURIComponent(slug)}`;
    const fromAssets = assetImagesBy.get(p.id) || [];
    const fromJson = firstImages(p.images, origin);
    const images = [...new Set([...fromAssets, ...fromJson])].slice(0, 10);
    if (images.length === 0) continue;

    const description =
      stripHtml(p.description || "") ||
      stripHtml(p.short_description || "") ||
      `${p.name} — shop online at SimpleCart Store with cash on delivery across Pakistan.`;

    const optionBits = Object.values(v.option_values || {})
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    const title =
      optionBits.length > 0 ? `${p.name} (${optionBits.join(" / ")})` : p.name;

    const shipCost = p.free_delivery ? 0 : shippingPkr;
    const shipping = `PK:::${shipCost.toFixed(2)} PKR`;

    const row: Record<(typeof COLUMNS)[number], string> = {
      id: sku,
      title: title.slice(0, 150),
      description: description.slice(0, 5000),
      link,
      image_link: images[0],
      additional_image_link: images.slice(1).join(","),
      availability,
      condition: "new",
      price: onSale ? formatMoneyPkr(compare) : formatMoneyPkr(price),
      sale_price: onSale ? formatMoneyPkr(price) : "",
      brand,
      gtin,
      mpn,
      identifier_exists: gtin ? "yes" : "no",
      material,
      product_type: productTypeBy.get(p.id) || "Home",
      canonical_link: link,
      shipping,
    };

    lines.push(COLUMNS.map((c) => tsvEscape(row[c])).join("\t"));
  }

  const body = `${lines.join("\n")}\n`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
