/**
 * Organize SimpleCart Store catalog into short collections + tags,
 * assign every active product, set homepage rails, and fill collection SEO.
 *
 *   npx tsx scripts/organize-catalog-collections.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type ProductRow = { id: string; slug: string; name: string };

type CollectionDef = {
  slug: string;
  name: string;
  description: string;
  tag: string;
  tagLabel: string;
  sort: number;
  match: (slug: string, name: string) => boolean;
};

const COLLECTIONS: CollectionDef[] = [
  {
    slug: "drinkware-tumblers",
    name: "Drinkware & Tumblers",
    description:
      "Water bottles, flasks, tumblers, sippers and straws — hot and cold drinkware for everyday use.",
    tag: "drinkware",
    tagLabel: "Drinkware",
    sort: 0,
    match: (s, n) =>
      /bottle|flask|thermos|tumbler|sipper|pitcher|jug|straw|mug|cup|drinkware|mason/.test(
        `${s} ${n}`.toLowerCase(),
      ) && !/kettle|grinder|stove|heater|wax|massager|mosquito|lamp|lighter|chopper|cutlery|utensil|injector|clock|tissue|humidifier|blower|toothbrush|trimmer|blackhead|hair|mirror/.test(
        `${s} ${n}`.toLowerCase(),
      ),
  },
  {
    slug: "kitchen-essentials",
    name: "Kitchen Essentials",
    description:
      "Utensils, cutlery, choppers, grinders and kitchen tools for everyday cooking.",
    tag: "kitchen",
    tagLabel: "Kitchen",
    sort: 1,
    match: (s, n) => {
      const t = `${s} ${n}`.toLowerCase();
      // Keep electric appliances out of Kitchen tools (they belong in Appliances).
      if (/stove|kettle|humidifier|blower|halogen|room.?heater/.test(t)) return false;
      if (/heater/.test(t) && !/wax/.test(t)) return false;
      return /utensil|cutlery|chopper|grinder|injector|marinade|lighter|baking|seasoning|meat|food processor|egg beater|mixer|kitchen/.test(
        t,
      );
    },
  },
  {
    slug: "home-appliances",
    name: "Home Appliances",
    description:
      "Electric kettles, stoves, heaters, humidifiers and handy home appliances.",
    tag: "appliances",
    tagLabel: "Appliances",
    sort: 2,
    match: (s, n) =>
      /kettle|stove|heater|humidifier|blower|warmer|halogen|room heater|electric stove|food warmer/.test(
        `${s} ${n}`.toLowerCase(),
      ) && !/wax/.test(`${s} ${n}`.toLowerCase()),
  },
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    description:
      "Hair tools, wax warmers, mirrors, trimmers and personal care essentials.",
    tag: "beauty",
    tagLabel: "Beauty",
    sort: 3,
    match: (s, n) =>
      /hair|blackhead|makeup|mirror|toothbrush|trimmer|wax|beauty|shaver|acne|straightener|dryer|lint|fuzz/.test(
        `${s} ${n}`.toLowerCase(),
      ),
  },
  {
    slug: "lamps-lighting",
    name: "Lamps & Lighting",
    description: "Table lamps, night lights and solar work lights for home and outdoor use.",
    tag: "lighting",
    tagLabel: "Lighting",
    sort: 4,
    match: (s, n) => {
      const t = `${s} ${n}`.toLowerCase();
      if (
        /mosquito|killer|lighter|blackhead|trimmer|toothbrush|bottle|flask|thermos|tumbler|sipper|wax|hair|straightener|dryer/.test(
          t,
        )
      ) {
        return false;
      }
      return /lamp|night.?light|work.?light|table.?lamp|crystal|solar|\brgb\b|\bled\b/.test(t);
    },
  },
  {
    slug: "pest-control",
    name: "Pest Control",
    description: "Mosquito killer lamps and rechargeable rackets for home pest control.",
    tag: "pest-control",
    tagLabel: "Pest Control",
    sort: 5,
    match: (s, n) => /mosquito|bug|zapper|insect|racket/.test(`${s} ${n}`.toLowerCase()),
  },
  {
    slug: "wellness-comfort",
    name: "Wellness & Comfort",
    description: "Massagers, relief belts and everyday comfort products.",
    tag: "wellness",
    tagLabel: "Wellness",
    sort: 6,
    match: (s, n) => /massager|cramp|relief|cellulite|body massager/.test(`${s} ${n}`.toLowerCase()),
  },
  {
    slug: "home-essentials",
    name: "Home Essentials",
    description: "Clocks, organizers and everyday home essentials.",
    tag: "home",
    tagLabel: "Home",
    sort: 7,
    match: () => true, // catch-all last
  },
];

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function clamp(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1);
  const sp = slice.lastIndexOf(" ");
  return `${(sp > max * 0.55 ? slice.slice(0, sp) : slice).trim()}…`;
}

/** All matching niches (products can sit in 2–3 collections); fall back to Home. */
function classifyAll(p: ProductRow): CollectionDef[] {
  const matches = COLLECTIONS.filter(
    (c) => c.slug !== "home-essentials" && c.match(p.slug, p.name),
  );
  if (matches.length > 0) return matches;
  return [COLLECTIONS.find((c) => c.slug === "home-essentials")!];
}

async function main() {
  if (!url) fail("Missing SUPABASE URL");
  if (!serviceKey) fail("Missing SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey);

  let rows: ProductRow[] = [];
  try {
    rows = JSON.parse(
      readFileSync(resolve(__dirname, "_tmp-products-rows.json"), "utf8"),
    ) as ProductRow[];
  } catch {
    /* fetch live */
  }
  if (!rows.length) {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name")
      .eq("status", "active")
      .order("name");
    if (error) fail(error.message);
    rows = (data ?? []) as ProductRow[];
  }

  console.log(`[organize] Products: ${rows.length}`);

  // --- Tags ---
  const tagIdByName = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const { data, error } = await supabase
      .from("tags")
      .upsert(
        { name: c.tag, label: c.tagLabel, updated_at: new Date().toISOString() },
        { onConflict: "name" },
      )
      .select("id, name")
      .single();
    if (error) fail(`tag ${c.tag}: ${error.message}`);
    tagIdByName.set(data!.name, data!.id);
  }
  console.log(`[organize] Tags: ${tagIdByName.size}`);

  // --- Collections (rename legacy water-bottles → drinkware if present) ---
  const { data: legacy } = await supabase
    .from("collections")
    .select("id, slug")
    .eq("slug", "water-bottles")
    .maybeSingle();

  if (legacy?.id) {
    await supabase
      .from("collections")
      .update({
        slug: "drinkware-tumblers",
        name: "Drinkware & Tumblers",
        description: COLLECTIONS[0]!.description,
        sort_order: 0,
        collection_type: "manual",
        updated_at: new Date().toISOString(),
      })
      .eq("id", legacy.id);
    console.log("[organize] Renamed water-bottles → drinkware");
  }

  const collectionIdBySlug = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const { data, error } = await supabase
      .from("collections")
      .upsert(
        {
          slug: c.slug,
          name: c.name,
          description: c.description,
          sort_order: c.sort,
          collection_type: "manual",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();
    if (error) fail(`collection ${c.slug}: ${error.message}`);
    collectionIdBySlug.set(data!.slug, data!.id);
  }
  console.log(`[organize] Collections: ${collectionIdBySlug.size}`);

  // Hero images from first product image per group (multi-collection allowed)
  const byCollection = new Map<string, ProductRow[]>();
  for (const p of rows) {
    for (const c of classifyAll(p)) {
      const list = byCollection.get(c.slug) ?? [];
      list.push(p);
      byCollection.set(c.slug, list);
    }
  }

  for (const [slug, products] of byCollection) {
    const first = products[0];
    if (!first) continue;
    const { data: prod } = await supabase
      .from("products")
      .select("images")
      .eq("id", first.id)
      .maybeSingle();
    const images = (prod?.images as string[] | null) ?? [];
    const hero = typeof images[0] === "string" ? images[0].trim() : "";
    if (hero) {
      await supabase
        .from("collections")
        .update({ hero_image: hero, updated_at: new Date().toISOString() })
        .eq("slug", slug);
    }
  }

  // Clear memberships then rebuild
  const productIds = rows.map((r) => r.id);
  await supabase.from("product_collections").delete().in("product_id", productIds);
  await supabase.from("product_tags").delete().in("product_id", productIds);

  const pcRows: { product_id: string; collection_id: string }[] = [];
  const ptRows: { product_id: string; tag_id: string }[] = [];
  const productTagsText = new Map<string, string[]>();

  for (const p of rows) {
    const cols = classifyAll(p);
    const tagNames: string[] = [];
    for (const c of cols) {
      const cid = collectionIdBySlug.get(c.slug)!;
      const tid = tagIdByName.get(c.tag)!;
      pcRows.push({ product_id: p.id, collection_id: cid });
      ptRows.push({ product_id: p.id, tag_id: tid });
      tagNames.push(c.tag);
    }
    productTagsText.set(p.id, tagNames);
  }

  // chunk inserts
  for (let i = 0; i < pcRows.length; i += 40) {
    const chunk = pcRows.slice(i, i + 40);
    const { error } = await supabase.from("product_collections").insert(chunk);
    if (error) fail(`product_collections: ${error.message}`);
  }
  for (let i = 0; i < ptRows.length; i += 40) {
    const chunk = ptRows.slice(i, i + 40);
    const { error } = await supabase.from("product_tags").insert(chunk);
    if (error) fail(`product_tags: ${error.message}`);
  }

  // Sync products.tags text[] for admin/legacy
  for (const p of rows) {
    const tags = productTagsText.get(p.id) ?? [];
    await supabase
      .from("products")
      .update({ tags, updated_at: new Date().toISOString() })
      .eq("id", p.id);
  }

  console.log(`[organize] Assigned ${pcRows.length} product↔collection + tag links`);

  // Deactivate tagged home sections so home_rails drives homepage (SEO → /collections/)
  await supabase
    .from("home_page_sections")
    .update({ is_active: false })
    .eq("is_active", true);

  // Homepage rails: unique products across rails (no repeated cards/images)
  const usedOnHome = new Set<string>();
  const rails = COLLECTIONS.filter((c) => (byCollection.get(c.slug) ?? []).length > 0).map(
    (c) => {
      const products = byCollection.get(c.slug) ?? [];
      const exclusive = products.filter((p) => classifyAll(p).length === 1);
      const shared = products.filter((p) => classifyAll(p).length > 1);
      const ordered = [...exclusive, ...shared];
      const productSlugs: string[] = [];
      for (const p of ordered) {
        if (usedOnHome.has(p.slug)) continue;
        usedOnHome.add(p.slug);
        productSlugs.push(p.slug);
        if (productSlugs.length >= 8) break;
      }
      return {
        title: c.name,
        viewAllHref: `/collections/${c.slug}`,
        productSlugs,
      };
    },
  );

  const kitchenHero =
    (
      await supabase
        .from("collections")
        .select("hero_image")
        .eq("slug", "kitchen-essentials")
        .maybeSingle()
    ).data?.hero_image ?? "";
  const drinkwareHero =
    (
      await supabase
        .from("collections")
        .select("hero_image")
        .eq("slug", "drinkware-tumblers")
        .maybeSingle()
    ).data?.hero_image ?? "";
  const featuredImage = kitchenHero || drinkwareHero || "";

  const { error: settingsErr } = await supabase
    .from("home_page_settings")
    .update({
      home_rails: rails,
      featured_block: {
        eyebrow: "Shop by category",
        title: "Home essentials, sorted",
        description:
          "Browse drinkware, kitchen tools, beauty gadgets and appliances — curated for everyday use.",
        imageUrl: featuredImage,
        primaryLabel: kitchenHero ? "Shop kitchen" : "Shop drinkware",
        primaryHref: kitchenHero
          ? "/collections/kitchen-essentials"
          : "/collections/drinkware-tumblers",
        secondaryLabel: "All collections",
        secondaryHref: "/collections",
      },
      mission_paragraph:
        "<p>SimpleCart Store brings practical home, kitchen and beauty essentials online in Pakistan — clear prices, COD, and nationwide delivery.</p>",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (settingsErr) fail(`home_page_settings: ${settingsErr.message}`);
  console.log(`[organize] Home rails: ${rails.length}`);

  // SEO for each collection
  for (const c of COLLECTIONS) {
    const id = collectionIdBySlug.get(c.slug);
    if (!id) continue;
    const count = (byCollection.get(c.slug) ?? []).length;
    if (count === 0) continue;

    const title = `${c.name} in Pakistan`;
    const description = clamp(
      `Shop ${c.name.toLowerCase()} online at SimpleCart Store. ${c.description} Cash on delivery available.`,
      160,
    );
    const keywords = [
      `${c.name} Pakistan`,
      `buy ${c.name.toLowerCase()} online`,
      "online shopping Pakistan",
      "SimpleCart Store",
      "cash on delivery",
      c.tag,
    ];

    const { data: existing } = await supabase
      .from("seo_meta")
      .select("id")
      .eq("subject_type", "collection")
      .eq("subject_id", id)
      .eq("locale", "en")
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("seo_meta")
        .update({
          title,
          description,
          keywords,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("seo_meta").insert({
        subject_type: "collection",
        subject_id: id,
        locale: "en",
        title,
        description,
        keywords,
      });
    }
  }

  // Route SEO for /collections
  const { data: colRoute } = await supabase
    .from("seo_meta")
    .select("id")
    .eq("subject_type", "route")
    .eq("subject_key", "/collections")
    .eq("locale", "en")
    .maybeSingle();
  const colRoutePayload = {
    title: "Shop Collections",
    description: clamp(
      "Browse Drinkware, Kitchen, Beauty, Appliances and more at SimpleCart Store. Home essentials with delivery across Pakistan.",
      160,
    ),
    keywords: [
      "shop collections Pakistan",
      "home essentials",
      "drinkware",
      "kitchen",
      "SimpleCart Store",
    ],
    updated_at: new Date().toISOString(),
  };
  if (colRoute?.id) {
    await supabase.from("seo_meta").update(colRoutePayload).eq("id", colRoute.id);
  } else {
    await supabase.from("seo_meta").insert({
      subject_type: "route",
      subject_key: "/collections",
      locale: "en",
      ...colRoutePayload,
    });
  }

  // Summary
  for (const c of COLLECTIONS) {
    const n = (byCollection.get(c.slug) ?? []).length;
    if (n) console.log(`  ${c.slug.padEnd(14)} ${n}`);
  }

  console.log("[organize] Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
