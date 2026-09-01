import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://onmnnxcdwcuegsbvjoqa.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubW5ueGNkd2N1ZWdzYnZqb3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjMwMjA5MiwiZXhwIjoyMTAxODc4MDkyfQ.TMAUVI5XJYlYnJHURRab1NDxydgiUeLTLlZPZrOlIb4";

const supabase = createClient(supabaseUrl, serviceKey);

async function exportIds() {
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, slug, name, status")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (pErr) {
    console.error("Error:", pErr);
    process.exit(1);
  }

  const productIds = products.map((p) => p.id);
  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, price, compare_at_price, option_values")
    .in("product_id", productIds);

  if (vErr) {
    console.error("Error:", vErr);
    process.exit(1);
  }

  const productBy = new Map(products.map((p) => [p.id, p]));
  const rows = [];

  for (const v of variants || []) {
    const p = productBy.get(v.product_id);
    if (!p) continue;
    const sku = (v.sku || "").trim() || v.id;
    const optionBits = Object.values(v.option_values || {})
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    const variantTitle =
      optionBits.length > 0 ? `${p.name} (${optionBits.join(" / ")})` : p.name;

    rows.push({
      content_id: sku,
      product_name: p.name,
      variant_title: variantTitle,
      slug: p.slug,
      product_url: `https://www.simplecartstore.com/products/${encodeURIComponent(p.slug)}`,
      price_pkr: v.price,
      compare_at_pkr: v.compare_at_price,
      variant_id: v.id,
      product_id: p.id,
    });
  }

  rows.sort((a, b) => a.product_name.localeCompare(b.product_name));

  // CSV
  const headers = [
    "content_id",
    "product_name",
    "variant_title",
    "slug",
    "product_url",
    "price_pkr",
    "compare_at_pkr",
  ];
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h] ?? "");
          return val.includes(",") || val.includes('"')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(","),
    ),
  ];
  const csv = csvLines.join("\n");

  const outDir = join(process.env.USERPROFILE || "", "Desktop");
  const csvPath = join(outDir, "simplecartstore-meta-content-ids.csv");
  writeFileSync(csvPath, csv, "utf8");

  console.log(`Total active products: ${products.length}`);
  console.log(`Total feed rows (variants): ${rows.length}`);
  console.log(`CSV saved to: ${csvPath}`);
  console.log("\n--- First 15 rows ---");
  rows.slice(0, 15).forEach((r, i) => {
    console.log(`${i + 1}. ${r.content_id} | ${r.product_name}`);
  });
  console.log("\n--- ID format breakdown ---");
  const formats = { daraz: 0, numeric_pk: 0, sim: 0, panda: 0, uuid: 0, other: 0 };
  for (const r of rows) {
    const id = r.content_id;
    if (id.startsWith("DARAZ-")) formats.daraz++;
    else if (/^\d+-PK-/.test(id)) formats.numeric_pk++;
    else if (id.startsWith("SIM-")) formats.sim++;
    else if (id.includes("PANDA")) formats.panda++;
    else if (/^[0-9a-f-]{36}$/i.test(id)) formats.uuid++;
    else formats.other++;
  }
  console.log(formats);
}

exportIds();
