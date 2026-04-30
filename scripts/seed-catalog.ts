/**
 * Seeds public.collections, public.products, public.product_variants from static catalog TS.
 * Uses service role (bypasses RLS).
 *
 * From nextjs-project:
 *   npm run seed:catalog
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SEED_VERTICAL=tailoring|clothing|jewellery|home-compliance (default: tailoring).
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCatalog } from "../app/lib/catalog/index";
import type { StoreVerticalId } from "../app/lib/store-brand.types";
import { seedOutflintDemoCatalog } from "./seed-outflint-demo";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

config({ path: resolve(root, ".env") });

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function verticalFromEnv(): StoreVerticalId {
  const v = process.env.SEED_VERTICAL?.trim();
  if (!v) return "tailoring";
  if (
    v === "jewellery" ||
    v === "home-compliance" ||
    v === "tailoring" ||
    v === "clothing"
  ) {
    return v;
  }
  return "tailoring";
}

async function main() {
  if (!url) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  if (!serviceKey)
    fail(
      "Missing SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role).",
    );

  const vertical = verticalFromEnv();
  if (vertical === "tailoring") {
    await seedOutflintDemoCatalog();
    return;
  }

  const catalog = getCatalog(vertical);
  const supabase = createClient(url, serviceKey);

  const { data: sizeRows, error: sizeErr } = await supabase
    .from("sizes")
    .select("id, display_name");
  if (sizeErr) {
    console.error("[seed] sizes", sizeErr.message);
    fail(sizeErr.message);
  }
  const sizeIdByLabel = new Map(
    (sizeRows ?? []).map((r: { id: string; display_name: string }) => [r.display_name, r.id]),
  );

  const { data: colorRows, error: colorErr } = await supabase
    .from("colors")
    .select("id, name");
  if (colorErr) {
    console.error("[seed] colors", colorErr.message);
    fail(colorErr.message);
  }
  const colorIdByName = new Map(
    (colorRows ?? []).map((r: { id: string; name: string }) => [r.name, r.id]),
  );

  const collectionSlugToId = new Map<string, string>();

  for (let i = 0; i < catalog.collections.length; i++) {
    const c = catalog.collections[i];
    const { data, error } = await supabase
      .from("collections")
      .upsert(
        {
          slug: c.slug,
          name: c.name,
          description: c.description,
          hero_image: c.heroImage,
          sort_order: i,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error) {
      console.error("[seed] collection upsert", c.slug, error.message);
      fail(error.message);
    }
    collectionSlugToId.set(c.slug, data!.id);
  }

  for (const p of catalog.products) {
    const collectionId = collectionSlugToId.get(p.collection) ?? null;

    const images = [p.image];

    const variantQtySum = 40 + 40 + 35;

    const { data: prodRow, error: pErr } = await supabase
      .from("products")
      .upsert(
        {
          slug: p.slug,
          name: p.name,
          short_description: p.shortDescription,
          description: p.description,
          status: "active",
          images,
          tags: p.tags,
          rating: p.rating,
          reviews_count: p.reviews,
          stock_total: variantQtySum,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (pErr) {
      console.error("[seed] product upsert", p.slug, pErr.message);
      fail(pErr.message);
    }

    const productId = prodRow!.id;

    await supabase.from("product_assets").delete().eq("product_id", productId);
    for (let ai = 0; ai < images.length; ai++) {
      const u = images[ai];
      if (typeof u !== "string" || !u.trim()) continue;
      const { error: astErr } = await supabase.from("product_assets").insert({
        product_id: productId,
        url: u.trim(),
        kind: "image",
        sort_order: ai,
        alt_text: "",
      });
      if (astErr) {
        console.error("[seed] product_assets", p.slug, astErr.message);
        fail(astErr.message);
      }
    }

    await supabase.from("product_collections").delete().eq("product_id", productId);
    if (collectionId) {
      const { error: pcErr } = await supabase.from("product_collections").insert({
        product_id: productId,
        collection_id: collectionId,
      });
      if (pcErr) {
        console.error("[seed] product_collections", p.slug, pcErr.message);
        fail(pcErr.message);
      }
    }

    // Remove existing variants for idempotent re-seed
    await supabase.from("product_variants").delete().eq("product_id", productId);

    const variantDefs: {
      sku: string;
      option_values: Record<string, string>;
      sizeLabel: string;
      colorName: string;
      price: number;
      compare_at_price: number | null;
      quantity_on_hand: number;
    }[] = [
      {
        sku: `${p.slug}-S-BLK`.slice(0, 120),
        option_values: { size: "S", color: "Black" },
        sizeLabel: "S",
        colorName: "Black",
        price: p.price,
        compare_at_price: p.compareAtPrice ?? null,
        quantity_on_hand: 40,
      },
      {
        sku: `${p.slug}-M-BLK`.slice(0, 120),
        option_values: { size: "M", color: "Black" },
        sizeLabel: "M",
        colorName: "Black",
        price: p.price,
        compare_at_price: p.compareAtPrice ?? null,
        quantity_on_hand: 40,
      },
      {
        sku: `${p.slug}-L-WHT`.slice(0, 120),
        option_values: { size: "L", color: "White" },
        sizeLabel: "L",
        colorName: "White",
        price: p.price,
        compare_at_price: p.compareAtPrice ?? null,
        quantity_on_hand: 35,
      },
    ];

    const { data: inserted, error: vErr } = await supabase
      .from("product_variants")
      .insert(
        variantDefs.map((v) => ({
          product_id: productId,
          sku: v.sku,
          option_values: v.option_values,
          size_id: sizeIdByLabel.get(v.sizeLabel) ?? null,
          color_id: colorIdByName.get(v.colorName) ?? null,
          price: v.price,
          compare_at_price: v.compare_at_price,
        })),
      )
      .select("id");

    if (vErr || !inserted?.length) {
      console.error("[seed] variants", p.slug, vErr?.message);
      fail(vErr?.message ?? "variant insert failed");
    }

    const { error: invInsertErr } = await supabase.from("inventory").insert(
      inserted.map((row, i) => ({
        product_variant_id: row.id as string,
        quantity_on_hand: variantDefs[i]!.quantity_on_hand,
        quantity_reserved: 0,
      })),
    );
    if (invInsertErr) {
      console.error("[seed] inventory", p.slug, invInsertErr.message);
      fail(invInsertErr.message);
    }
  }

  console.log(
    `[seed] Done. Vertical=${vertical} collections=${catalog.collections.length} products=${catalog.products.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
