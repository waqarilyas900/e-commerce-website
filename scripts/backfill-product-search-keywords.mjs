import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://onmnnxcdwcuegsbvjoqa.supabase.co";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubW5ueGNkd2N1ZWdzYnZqb3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjMwMjA5MiwiZXhwIjoyMTAxODc4MDkyfQ.TMAUVI5XJYlYnJHURRab1NDxydgiUeLTLlZPZrOlIb4";

if (!serviceKey) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "in", "on", "at", "to", "of", "is", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "shall", "can", "need", "our", "your",
  "this", "that", "these", "those", "it", "its", "from", "by", "as", "not", "no", "but", "if",
  "than", "then", "so", "very", "just", "about", "into", "over", "pk", "pakistan", "buy",
  "online", "shop", "store", "price", "sale",
]);

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ");
}

function tokenize(text) {
  return String(text || "")
    .split(/[^a-zA-Z0-9\u0600-\u06FF]+/)
    .filter((w) => w.length >= 2);
}

function buildKeywords({ name, slug, shortDescription, description, tagLabels, skus, extra }) {
  const bag = new Set();
  const add = (raw) => {
    const s = String(raw || "").trim().toLowerCase();
    if (s.length >= 2) bag.add(s);
  };
  const addText = (text) => {
    const trimmed = String(text || "").trim();
    if (trimmed.length >= 2) add(trimmed);
    for (const w of tokenize(text)) {
      if (w.length >= 2 && !STOP_WORDS.has(w)) add(w);
    }
  };

  addText(name);
  addText(String(slug || "").replace(/-/g, " "));
  const nameParts = tokenize(name);
  for (let i = 0; i < nameParts.length - 1; i++) add(`${nameParts[i]} ${nameParts[i + 1]}`);
  for (const tag of tagLabels) addText(tag);
  for (const sku of skus) {
    const s = String(sku || "").trim();
    if (!s) continue;
    add(s);
    for (const part of s.split(/[-_./]/)) if (part.length >= 2) add(part);
  }
  addText(stripHtml(shortDescription));
  addText(stripHtml(description));
  if (extra) {
    for (const part of String(extra).split(/[,;\n]+/)) addText(part);
  }
  return Array.from(bag).join(", ");
}

async function main() {
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, name, slug, short_description, description, tags, search_keywords_extra");

  if (pErr) {
    console.error(pErr);
    process.exit(1);
  }

  const ids = products.map((p) => p.id);
  const { data: variants } = await supabase
    .from("product_variants")
    .select("product_id, sku")
    .in("product_id", ids);

  const { data: ptRows } = await supabase.from("product_tags").select("product_id, tag_id").in("product_id", ids);
  const tagIds = [...new Set((ptRows || []).map((r) => r.tag_id))];
  const { data: tagRows } = tagIds.length
    ? await supabase.from("tags").select("id, label, name").in("id", tagIds)
    : { data: [] };
  const tagById = new Map((tagRows || []).map((t) => [t.id, t.label || t.name]));

  const skusByProduct = new Map();
  for (const v of variants || []) {
    const list = skusByProduct.get(v.product_id) || [];
    if (v.sku) list.push(v.sku);
    skusByProduct.set(v.product_id, list);
  }

  const tagsByProduct = new Map();
  for (const row of ptRows || []) {
    const label = tagById.get(row.tag_id);
    if (!label) continue;
    const list = tagsByProduct.get(row.product_id) || [];
    list.push(label);
    tagsByProduct.set(row.product_id, list);
  }

  let updated = 0;
  for (const p of products) {
    const legacyTags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string" && !t.includes(":")) : [];
    const tagLabels = [...(tagsByProduct.get(p.id) || []), ...legacyTags];
    const search_keywords = buildKeywords({
      name: p.name,
      slug: p.slug,
      shortDescription: p.short_description,
      description: p.description,
      tagLabels,
      skus: skusByProduct.get(p.id) || [],
      extra: p.search_keywords_extra,
    });

    const { error } = await supabase
      .from("products")
      .update({ search_keywords, updated_at: new Date().toISOString() })
      .eq("id", p.id);

    if (error) {
      console.error(`Failed ${p.id}:`, error.message);
      continue;
    }
    updated += 1;
  }

  console.log(`Updated search_keywords for ${updated}/${products.length} products.`);
}

main();
