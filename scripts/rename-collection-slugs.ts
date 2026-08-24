/**
 * Rename collection slugs + display names, add 301 redirects, refresh home rails URLs.
 *
 *   npx tsx scripts/rename-collection-slugs.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type CollectionUpdate = {
  oldSlug: string;
  slug: string;
  name: string;
  description: string;
};

const UPDATES: CollectionUpdate[] = [
  {
    oldSlug: "drinkware",
    slug: "drinkware-tumblers",
    name: "Drinkware & Tumblers",
    description:
      "Water bottles, flasks, tumblers, sippers and straws — hot and cold drinkware for everyday use.",
  },
  {
    oldSlug: "kitchen",
    slug: "kitchen-essentials",
    name: "Kitchen Essentials",
    description:
      "Utensils, cutlery, choppers, grinders and kitchen tools for everyday cooking.",
  },
  {
    oldSlug: "appliances",
    slug: "home-appliances",
    name: "Home Appliances",
    description:
      "Electric kettles, stoves, heaters, humidifiers and handy home appliances.",
  },
  {
    oldSlug: "beauty",
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    description:
      "Hair tools, wax warmers, mirrors, trimmers and personal care essentials.",
  },
  {
    oldSlug: "lighting",
    slug: "lamps-lighting",
    name: "Lamps & Lighting",
    description: "Table lamps, night lights and solar work lights for home and outdoor use.",
  },
  {
    oldSlug: "pest-control",
    slug: "pest-control",
    name: "Pest Control",
    description: "Mosquito killer lamps and rechargeable rackets for home pest control.",
  },
  {
    oldSlug: "wellness",
    slug: "wellness-comfort",
    name: "Wellness & Comfort",
    description: "Massagers, relief belts and everyday comfort products.",
  },
  {
    oldSlug: "home",
    slug: "home-essentials",
    name: "Home Essentials",
    description: "Clocks, organizers and everyday home essentials.",
  },
];

const LEGACY_REDIRECTS: { from: string; to: string }[] = [
  { from: "/collections/water-bottles", to: "/collections/drinkware-tumblers" },
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

function titleForCollectionHref(href: string): string | undefined {
  for (const u of UPDATES) {
    if (
      href.includes(`/collections/${u.slug}`) ||
      (u.oldSlug !== u.slug && href.includes(`/collections/${u.oldSlug}`))
    ) {
      return u.name;
    }
  }
  return undefined;
}

function rewriteCollectionHref(href: string): string {
  let out = href;
  for (const u of UPDATES) {
    if (u.oldSlug === u.slug) continue;
    out = out.replace(
      `/collections/${u.oldSlug}`,
      `/collections/${u.slug}`,
    );
  }
  return out;
}

async function upsertRedirect(
  supabase: ReturnType<typeof createClient>,
  fromPath: string,
  toPath: string,
) {
  const { error } = await supabase.from("url_redirects").upsert(
    {
      from_path: fromPath,
      to_path: toPath,
      status_code: 301,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "from_path" },
  );
  if (error) fail(`redirect ${fromPath}: ${error.message}`);
}

async function main() {
  if (!url) fail("Missing SUPABASE URL");
  if (!serviceKey) fail("Missing SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey);

  for (const u of UPDATES) {
    const { data: row } = await supabase
      .from("collections")
      .select("id, slug, name")
      .eq("slug", u.oldSlug)
      .maybeSingle();

    if (!row?.id && u.oldSlug !== u.slug) {
      const { data: already } = await supabase
        .from("collections")
        .select("id")
        .eq("slug", u.slug)
        .maybeSingle();
      if (already?.id) {
        console.log(`[skip] ${u.slug} already exists`);
        continue;
      }
      console.warn(`[warn] missing collection slug=${u.oldSlug}`);
      continue;
    }

    if (row?.id) {
      const { error } = await supabase
        .from("collections")
        .update({
          slug: u.slug,
          name: u.name,
          description: u.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) fail(`collection ${u.oldSlug}: ${error.message}`);
      console.log(`[collection] ${u.oldSlug} → ${u.slug} (${u.name})`);

      const title = `${u.name} in Pakistan`;
      const description = clamp(
        `Shop ${u.name.toLowerCase()} online at SimpleCart Store. ${u.description} Cash on delivery available.`,
        160,
      );
      const keywords = [
        `${u.name} Pakistan`,
        `buy ${u.name.toLowerCase()} online`,
        "online shopping Pakistan",
        "SimpleCart Store",
        "cash on delivery",
        u.slug,
      ];

      const { data: seo } = await supabase
        .from("seo_meta")
        .select("id")
        .eq("subject_type", "collection")
        .eq("subject_id", row.id)
        .eq("locale", "en")
        .maybeSingle();

      if (seo?.id) {
        await supabase
          .from("seo_meta")
          .update({
            title,
            description,
            keywords,
            canonical_url: `https://www.simplecartstore.com/collections/${u.slug}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", seo.id);
      } else {
        await supabase.from("seo_meta").insert({
          subject_type: "collection",
          subject_id: row.id,
          locale: "en",
          title,
          description,
          keywords,
          canonical_url: `https://www.simplecartstore.com/collections/${u.slug}`,
        });
      }
    }

    if (u.oldSlug !== u.slug) {
      await upsertRedirect(
        supabase,
        `/collections/${u.oldSlug}`,
        `/collections/${u.slug}`,
      );
      console.log(`[redirect] /collections/${u.oldSlug} → /collections/${u.slug}`);
    }
  }

  for (const leg of LEGACY_REDIRECTS) {
    await upsertRedirect(supabase, leg.from, leg.to);
    console.log(`[redirect] ${leg.from} → ${leg.to}`);
  }

  const { data: settings } = await supabase
    .from("home_page_settings")
    .select("home_rails, featured_block")
    .eq("id", 1)
    .maybeSingle();

  if (settings) {
    type Rail = { title?: string; viewAllHref?: string; productSlugs?: string[] };
    const rails = ((settings.home_rails as Rail[] | null) ?? []).map((rail) => ({
      ...rail,
      title:
        (rail.viewAllHref ? titleForCollectionHref(rail.viewAllHref) : undefined) ??
        rail.title,
      viewAllHref: rail.viewAllHref ? rewriteCollectionHref(rail.viewAllHref) : rail.viewAllHref,
    }));

    const featured = (settings.featured_block as Record<string, unknown> | null) ?? {};
    const primaryHref =
      typeof featured.primaryHref === "string"
        ? rewriteCollectionHref(featured.primaryHref)
        : featured.primaryHref;

    const { error } = await supabase
      .from("home_page_settings")
      .update({
        home_rails: rails,
        featured_block: { ...featured, primaryHref },
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) fail(`home_page_settings: ${error.message}`);
    console.log(`[home] Updated ${rails.length} rails + featured_block`);
  }

  for (const u of UPDATES) {
    if (u.oldSlug === u.slug) continue;
    const { data: navRows, error: navErr } = await supabase
      .from("header_nav_menu_items")
      .select("id, label, slug")
      .eq("slug", u.oldSlug);
    if (navErr) fail(`header_nav_menu_items lookup ${u.oldSlug}: ${navErr.message}`);
    for (const row of navRows ?? []) {
      const { error } = await supabase
        .from("header_nav_menu_items")
        .update({
          slug: u.slug,
          label: u.name,
          name: u.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) fail(`header_nav_menu_items ${row.id}: ${error.message}`);
      console.log(`[header-nav] ${u.oldSlug} → ${u.slug} (${u.name})`);
    }
  }

  console.log("[rename] Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
