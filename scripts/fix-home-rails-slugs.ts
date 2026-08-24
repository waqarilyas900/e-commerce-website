/**
 * Rebuild home_page_settings.home_rails with canonical slugs, titles, and product previews.
 *
 *   npx tsx scripts/fix-home-rails-slugs.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTION_NAV_ITEMS } from "../lib/catalog/collection-nav";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type ProductRow = {
  id: string;
  slug: string;
  rating: number | null;
  reviews_count: number | null;
  created_at: string;
};

async function main() {
  if (!url || !serviceKey) throw new Error("Missing Supabase env");
  const supabase = createClient(url, serviceKey);

  const { data: collections } = await supabase
    .from("collections")
    .select("id, slug, name, sort_order")
    .order("sort_order");

  const bySlug = new Map((collections ?? []).map((c) => [c.slug as string, c]));

  const usedOnHome = new Set<string>();
  const rails: {
    title: string;
    viewAllHref: string;
    productSlugs: string[];
  }[] = [];

  for (const item of COLLECTION_NAV_ITEMS) {
    const col = bySlug.get(item.slug);
    if (!col) continue;

    const { data: links } = await supabase
      .from("product_collections")
      .select("product_id")
      .eq("collection_id", col.id);

    const productIds = (links ?? []).map((r) => r.product_id as string);
    if (!productIds.length) continue;

    const { data: products } = await supabase
      .from("products")
      .select("id, slug, rating, reviews_count, created_at")
      .in("id", productIds)
      .eq("status", "active");

    const ordered = ((products ?? []) as ProductRow[])
      .filter((p) => p.slug)
      .sort((a, b) => {
        const ar = a.rating ?? 0;
        const br = b.rating ?? 0;
        if (br !== ar) return br - ar;
        const av = a.reviews_count ?? 0;
        const bv = b.reviews_count ?? 0;
        if (bv !== av) return bv - av;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    const productSlugs: string[] = [];
    for (const row of ordered) {
      if (usedOnHome.has(row.id)) continue;
      usedOnHome.add(row.id);
      productSlugs.push(row.slug);
      if (productSlugs.length >= 8) break;
    }

    if (productSlugs.length === 0) continue;

    rails.push({
      title: item.name,
      viewAllHref: item.href,
      productSlugs,
    });
  }

  if (rails.length === 0) {
    throw new Error("Refusing to save empty home_rails — check product/collection links.");
  }

  const { error } = await supabase
    .from("home_page_settings")
    .update({
      home_rails: rails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) throw error;
  console.log(`[home-rails] Rebuilt ${rails.length} rails`);
  for (const r of rails) {
    console.log(`  ${r.title} → ${r.viewAllHref} (${r.productSlugs.length} preview slugs)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
