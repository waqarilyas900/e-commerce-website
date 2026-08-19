/**
 * Seeds the default SimpleCartStore demo collection + 5 products (tailoring /
 * stitching accessories) with varied variant strategies:
 * - Presser foot kit: single option "Style" (no size/color FKs)
 * - Thread snips: color-only variants with color_id (Black / White)
 * - Needle assortment: pack size variants + compare-at sale on smaller pack
 * - Machine oil: bottle size tiers + sale on entry tier
 * - Edge guide: Guide width × Color matrix with tiered pricing
 *
 * From nextjs-project:
 *   npm run seed:demo
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { outflintDemoCatalog } from "../app/lib/catalog/outflint.catalog";

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

type VariantSeed = {
  sku: string;
  option_values: Record<string, string>;
  /** Maps to `sizes.display_name` when set */
  sizeLabel: string | null;
  /** Maps to `colors.name` when set */
  colorName: string | null;
  price: number;
  compare_at_price: number | null;
  quantity_on_hand: number;
};

const VARIANTS_BY_SLUG: Record<string, VariantSeed[]> = {
  "outflint-universal-presser-foot-kit": [
    {
      sku: "outflint-foot-std",
      option_values: { Style: "Standard shank" },
      sizeLabel: null,
      colorName: null,
      price: 4990,
      compare_at_price: null,
      quantity_on_hand: 60,
    },
    {
      sku: "outflint-foot-hi",
      option_values: { Style: "Industrial high-shank" },
      sizeLabel: null,
      colorName: null,
      price: 8990,
      compare_at_price: null,
      quantity_on_hand: 45,
    },
  ],
  "outflint-thread-snips": [
    {
      sku: "outflint-snips-blk",
      option_values: { Color: "Black" },
      sizeLabel: null,
      colorName: "Black",
      price: 2490,
      compare_at_price: null,
      quantity_on_hand: 55,
    },
    {
      sku: "outflint-snips-wht",
      option_values: { Color: "White" },
      sizeLabel: null,
      colorName: "White",
      price: 2490,
      compare_at_price: null,
      quantity_on_hand: 50,
    },
  ],
  "outflint-hand-needle-assortment": [
    {
      sku: "outflint-needle-10",
      option_values: { size: "10-piece pack" },
      sizeLabel: null,
      colorName: null,
      price: 1200,
      compare_at_price: 1650,
      quantity_on_hand: 22,
    },
    {
      sku: "outflint-needle-50",
      option_values: { size: "50-piece pack" },
      sizeLabel: null,
      colorName: null,
      price: 4500,
      compare_at_price: null,
      quantity_on_hand: 12,
    },
  ],
  "outflint-machine-oil-bottle": [
    {
      sku: "outflint-oil-100",
      option_values: { Size: "100 ml" },
      sizeLabel: null,
      colorName: null,
      price: 450,
      compare_at_price: 590,
      quantity_on_hand: 80,
    },
    {
      sku: "outflint-oil-250",
      option_values: { Size: "250 ml" },
      sizeLabel: null,
      colorName: null,
      price: 950,
      compare_at_price: null,
      quantity_on_hand: 40,
    },
  ],
  "outflint-adjustable-edge-guide": [
    {
      sku: "outflint-guide-narrow-blk",
      option_values: { Guide: "Narrow", Color: "Black" },
      sizeLabel: null,
      colorName: "Black",
      price: 8490,
      compare_at_price: null,
      quantity_on_hand: 30,
    },
    {
      sku: "outflint-guide-narrow-wht",
      option_values: { Guide: "Narrow", Color: "White" },
      sizeLabel: null,
      colorName: "White",
      price: 8690,
      compare_at_price: null,
      quantity_on_hand: 28,
    },
    {
      sku: "outflint-guide-wide-blk",
      option_values: { Guide: "Wide", Color: "Black" },
      sizeLabel: null,
      colorName: "Black",
      price: 9190,
      compare_at_price: null,
      quantity_on_hand: 24,
    },
    {
      sku: "outflint-guide-wide-wht",
      option_values: { Guide: "Wide", Color: "White" },
      sizeLabel: null,
      colorName: "White",
      price: 9490,
      compare_at_price: null,
      quantity_on_hand: 20,
    },
  ],
};

const LOG = "[seed-demo]";

export async function seedOutflintDemoCatalog(): Promise<void> {
  if (!url) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  if (!serviceKey)
    fail(
      "Missing SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role).",
    );

  const catalog = outflintDemoCatalog;
  const supabase = createClient(url, serviceKey);

  const { data: sizeRows, error: sizeErr } = await supabase
    .from("sizes")
    .select("id, display_name");
  if (sizeErr) {
    console.error(LOG, "sizes", sizeErr.message);
    fail(sizeErr.message);
  }
  const sizeIdByLabel = new Map(
    (sizeRows ?? []).map((r: { id: string; display_name: string }) => [
      r.display_name,
      r.id,
    ]),
  );

  const { data: colorRows, error: colorErr } = await supabase
    .from("colors")
    .select("id, name");
  if (colorErr) {
    console.error(LOG, "colors", colorErr.message);
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
      console.error(LOG, "collection upsert", c.slug, error.message);
      fail(error.message);
    }
    collectionSlugToId.set(c.slug, data!.id);
  }

  for (const p of catalog.products) {
    const collectionId = collectionSlugToId.get(p.collection) ?? null;
    const variantDefs = VARIANTS_BY_SLUG[p.slug];
    if (!variantDefs?.length) {
      console.error(LOG, "Missing variant matrix for", p.slug);
      fail(`No VARIANTS_BY_SLUG entry for ${p.slug}`);
    }

    const stockTotal = variantDefs.reduce(
      (sum, v) => sum + v.quantity_on_hand,
      0,
    );

    const images = [p.image];

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
          stock_total: stockTotal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (pErr) {
      console.error(LOG, "product upsert", p.slug, pErr.message);
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
        console.error(LOG, "product_assets", p.slug, astErr.message);
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
        console.error(LOG, "product_collections", p.slug, pcErr.message);
        fail(pcErr.message);
      }
    }

    await supabase.from("product_variants").delete().eq("product_id", productId);

    const { data: inserted, error: vErr } = await supabase
      .from("product_variants")
      .insert(
        variantDefs.map((v) => ({
          product_id: productId,
          sku: v.sku.slice(0, 120),
          option_values: v.option_values,
          size_id: v.sizeLabel ? (sizeIdByLabel.get(v.sizeLabel) ?? null) : null,
          color_id: v.colorName ? (colorIdByName.get(v.colorName) ?? null) : null,
          price: v.price,
          compare_at_price: v.compare_at_price,
        })),
      )
      .select("id");

    if (vErr || !inserted?.length) {
      console.error(LOG, "variants", p.slug, vErr?.message);
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
      console.error(LOG, "inventory", p.slug, invInsertErr.message);
      fail(invInsertErr.message);
    }
  }

  console.log(
    `${LOG} Done. collection="${catalog.collections[0]?.slug}" products=${catalog.products.length}`,
  );
}

function isRunDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(resolve(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isRunDirectly()) {
  seedOutflintDemoCatalog().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
