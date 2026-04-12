/**
 * Seeds the Electronics collection + 5 products with varied variant strategies:
 * - USB hub: single option "Configuration" (no size/color FKs)
 * - Mouse: color-only variants with color_id (Black / White)
 * - Monitor: panel size + compare-at sale on 27″
 * - Speaker: storage tiers + sale on entry tier
 * - Keyboard: Switch × Color matrix with tiered pricing
 *
 * From nextjs-project:
 *   npm run seed:electronics
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { electronicsCatalog } from "../app/lib/catalog/electronics.catalog";

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
  "orbit-usb-c-hub": [
    {
      sku: "orbit-hub-4in1",
      option_values: { Configuration: "4-in-1" },
      sizeLabel: null,
      colorName: null,
      price: 4990,
      compare_at_price: null,
      quantity_on_hand: 60,
    },
    {
      sku: "orbit-hub-7in1-sd",
      option_values: { Configuration: "7-in-1 + SD" },
      sizeLabel: null,
      colorName: null,
      price: 8990,
      compare_at_price: null,
      quantity_on_hand: 45,
    },
  ],
  "pulse-wireless-mouse": [
    {
      sku: "pulse-mouse-blk",
      option_values: { Color: "Black" },
      sizeLabel: null,
      colorName: "Black",
      price: 2490,
      compare_at_price: null,
      quantity_on_hand: 55,
    },
    {
      sku: "pulse-mouse-wht",
      option_values: { Color: "White" },
      sizeLabel: null,
      colorName: "White",
      price: 2490,
      compare_at_price: null,
      quantity_on_hand: 50,
    },
  ],
  "vector-qhd-monitor": [
    {
      sku: "vector-mon-27qhd",
      option_values: { Panel: "27″ QHD" },
      sizeLabel: null,
      colorName: null,
      price: 45900,
      compare_at_price: 52900,
      quantity_on_hand: 22,
    },
    {
      sku: "vector-mon-32qhd",
      option_values: { Panel: "32″ QHD" },
      sizeLabel: null,
      colorName: null,
      price: 62900,
      compare_at_price: null,
      quantity_on_hand: 12,
    },
  ],
  "echo-mini-smart-speaker": [
    {
      sku: "echo-mini-8gb",
      option_values: { Storage: "8 GB" },
      sizeLabel: null,
      colorName: null,
      price: 15990,
      compare_at_price: 19990,
      quantity_on_hand: 80,
    },
    {
      sku: "echo-mini-16gb",
      option_values: { Storage: "16 GB" },
      sizeLabel: null,
      colorName: null,
      price: 19990,
      compare_at_price: null,
      quantity_on_hand: 40,
    },
  ],
  "typeforge-mechanical-keyboard": [
    {
      sku: "typeforge-lin-blk",
      option_values: { Switch: "Linear", Color: "Black" },
      sizeLabel: null,
      colorName: "Black",
      price: 8490,
      compare_at_price: null,
      quantity_on_hand: 30,
    },
    {
      sku: "typeforge-lin-wht",
      option_values: { Switch: "Linear", Color: "White" },
      sizeLabel: null,
      colorName: "White",
      price: 8690,
      compare_at_price: null,
      quantity_on_hand: 28,
    },
    {
      sku: "typeforge-tac-blk",
      option_values: { Switch: "Tactile", Color: "Black" },
      sizeLabel: null,
      colorName: "Black",
      price: 9190,
      compare_at_price: null,
      quantity_on_hand: 24,
    },
    {
      sku: "typeforge-tac-wht",
      option_values: { Switch: "Tactile", Color: "White" },
      sizeLabel: null,
      colorName: "White",
      price: 9490,
      compare_at_price: null,
      quantity_on_hand: 20,
    },
  ],
};

export async function seedElectronicsCatalog(): Promise<void> {
  if (!url) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.");
  if (!serviceKey)
    fail(
      "Missing SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role).",
    );

  const catalog = electronicsCatalog;
  const supabase = createClient(url, serviceKey);

  const { data: sizeRows, error: sizeErr } = await supabase
    .from("sizes")
    .select("id, display_name");
  if (sizeErr) {
    console.error("[seed-electronics] sizes", sizeErr.message);
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
    console.error("[seed-electronics] colors", colorErr.message);
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
      console.error("[seed-electronics] collection upsert", c.slug, error.message);
      fail(error.message);
    }
    collectionSlugToId.set(c.slug, data!.id);
  }

  for (const p of catalog.products) {
    const collectionId = collectionSlugToId.get(p.collection) ?? null;
    const variantDefs = VARIANTS_BY_SLUG[p.slug];
    if (!variantDefs?.length) {
      console.error("[seed-electronics] Missing variant matrix for", p.slug);
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
      console.error("[seed-electronics] product upsert", p.slug, pErr.message);
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
        console.error("[seed-electronics] product_assets", p.slug, astErr.message);
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
        console.error("[seed-electronics] product_collections", p.slug, pcErr.message);
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
      console.error("[seed-electronics] variants", p.slug, vErr?.message);
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
      console.error("[seed-electronics] inventory", p.slug, invInsertErr.message);
      fail(invInsertErr.message);
    }
  }

  console.log(
    `[seed-electronics] Done. collection="${catalog.collections[0]?.slug}" products=${catalog.products.length}`,
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
  seedElectronicsCatalog().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
