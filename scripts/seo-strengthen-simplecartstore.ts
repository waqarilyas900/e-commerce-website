/**
 * Fill missing SEO fields + strengthen copy for SimpleCart Store.
 * Does NOT invent search-engine verification tokens (those come from GSC / Meta).
 *
 *   npx tsx scripts/seo-strengthen-simplecartstore.ts
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
const BRAND = "SimpleCart Store";

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

function firstImage(images: unknown): string {
  if (!Array.isArray(images)) return "";
  const hit = images.find((u) => typeof u === "string" && u.trim());
  return typeof hit === "string" ? hit.trim() : "";
}

type RouteDef = {
  key: string;
  title: string;
  description: string;
  keywords: string[];
  noindex?: boolean;
};

const ROUTES: RouteDef[] = [
  {
    key: "/",
    title: "Home Essentials Online Pakistan",
    description:
      "Shop drinkware, kitchen tools, beauty gadgets and home appliances at SimpleCart Store. Fair PKR prices, cash on delivery, and nationwide delivery across Pakistan.",
    keywords: [
      "online shopping Pakistan",
      "home essentials",
      "drinkware Pakistan",
      "kitchen tools",
      "beauty gadgets",
      "cash on delivery",
      "SimpleCart Store",
    ],
  },
  {
    key: "/collections",
    title: "Shop All Collections",
    description:
      "Browse Drinkware, Kitchen, Appliances, Beauty, Lighting and more. Curated home essentials with COD and delivery across Pakistan from SimpleCart Store.",
    keywords: [
      "shop collections Pakistan",
      "drinkware",
      "kitchen",
      "appliances",
      "beauty",
      "SimpleCart Store",
    ],
  },
  {
    key: "/contact",
    title: "Contact Us",
    description:
      "Contact SimpleCart Store for order help, shipping questions or product advice. WhatsApp and email support for shoppers across Pakistan.",
    keywords: ["contact SimpleCart Store", "customer support Pakistan", "WhatsApp shopping help"],
  },
  {
    key: "/search",
    title: "Search Products",
    description:
      "Search SimpleCart Store for bottles, kitchen tools, beauty devices and home essentials. Fast results with delivery across Pakistan.",
    keywords: ["search products Pakistan", "find home essentials", "SimpleCart Store"],
  },
  {
    key: "/sale",
    title: "Sale & Deals",
    description:
      "Shop current deals on home, kitchen and beauty essentials at SimpleCart Store. Discounted picks with COD available in Pakistan.",
    keywords: ["sale Pakistan", "home deals", "discount kitchen", "SimpleCart Store"],
  },
  {
    key: "/collections/sale",
    title: "Sale Collection",
    description:
      "Browse sale items at SimpleCart Store — discounted drinkware, kitchen and beauty essentials with nationwide COD delivery.",
    keywords: ["sale collection", "discounted products Pakistan", "SimpleCart Store"],
  },
  {
    key: "/policies",
    title: "Store Policies",
    description:
      "Read SimpleCart Store shipping, returns and shopping policies. Clear rules for cash-on-delivery orders across Pakistan.",
    keywords: ["shipping policy", "return policy Pakistan", "SimpleCart Store policies"],
  },
  {
    key: "/login",
    title: "Log In",
    description: "Sign in to your SimpleCart Store account to track orders and manage your profile.",
    keywords: ["login", "SimpleCart Store account"],
    noindex: true,
  },
  {
    key: "/signup",
    title: "Create Account",
    description: "Create a SimpleCart Store account for faster checkout and order history in Pakistan.",
    keywords: ["sign up", "create account", "SimpleCart Store"],
    noindex: true,
  },
  {
    key: "/checkout",
    title: "Checkout",
    description: "Complete your SimpleCart Store order with cash on delivery across Pakistan.",
    keywords: ["checkout", "cash on delivery"],
    noindex: true,
  },
  {
    key: "/bundles",
    title: "Product Bundles",
    description:
      "Explore value bundles and multi-item offers at SimpleCart Store. Save on home and kitchen essentials with COD.",
    keywords: ["product bundles Pakistan", "combo deals", "SimpleCart Store"],
  },
];

async function upsertRoute(
  supabase: ReturnType<typeof createClient>,
  route: RouteDef,
  defaultOg: string,
  defaultOgAlt: string,
) {
  const payload = {
    title: route.title,
    description: clamp(route.description, 160),
    keywords: route.keywords,
    og_image_url: defaultOg,
    og_image_alt: defaultOgAlt,
    twitter_card: "summary_large_image",
    noindex: Boolean(route.noindex),
    nofollow: false,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("seo_meta")
    .select("id, og_image_url")
    .eq("subject_type", "route")
    .eq("subject_key", route.key)
    .eq("locale", "en")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("seo_meta")
      .update({
        ...payload,
        // Keep a custom OG if already set to a non-empty value different from blank
        og_image_url: existing.og_image_url?.trim() || defaultOg,
      })
      .eq("id", existing.id);
    if (error) fail(`route update ${route.key}: ${error.message}`);
  } else {
    const { error } = await supabase.from("seo_meta").insert({
      subject_type: "route",
      subject_key: route.key,
      locale: "en",
      ...payload,
    });
    if (error) fail(`route insert ${route.key}: ${error.message}`);
  }
}

async function main() {
  if (!url) fail("Missing SUPABASE URL");
  if (!serviceKey) fail("Missing SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, serviceKey);

  // --- seo_site: Lahore geo + locale consistency ---
  // Shop 308, Zeenat Block, Allama Iqbal Town, Lahore ≈ 31.508 / 74.287
  const { error: siteErr } = await supabase
    .from("seo_site")
    .update({
      geo_lat: 31.5082,
      geo_lng: 74.2874,
      locale: "en_US",
      address_postal_code: "54000",
      default_og_image_alt:
        "SimpleCart Store — drinkware, kitchen tools and beauty essentials online in Pakistan",
      organization_legal_name: BRAND,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (siteErr) fail(`seo_site: ${siteErr.message}`);
  console.log("[seo] seo_site geo + locale updated");

  const { data: site } = await supabase
    .from("seo_site")
    .select("default_og_image_url, default_og_image_alt, organization_logo_url")
    .eq("id", 1)
    .single();
  const defaultOg = (site?.default_og_image_url || "").trim();
  const defaultOgAlt =
    (site?.default_og_image_alt || "").trim() ||
    `${BRAND} — home essentials online in Pakistan`;
  if (!defaultOg) fail("seo_site.default_og_image_url is empty");

  // --- store_settings site copy ---
  const strongDescription = clamp(
    "Shop drinkware, kitchen tools, beauty gadgets and home appliances online in Pakistan at SimpleCart Store. Fair prices, cash on delivery, and nationwide delivery.",
    320,
  );
  await supabase
    .from("store_settings")
    .update({
      site_title: BRAND,
      store_name: BRAND,
      site_description: strongDescription,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  console.log("[seo] store_settings description strengthened");

  // --- Routes ---
  for (const route of ROUTES) {
    await upsertRoute(supabase, route, defaultOg, defaultOgAlt);
  }
  console.log(`[seo] routes upserted: ${ROUTES.length}`);

  // --- Collections: OG from hero_image + stronger copy ---
  const { data: collections } = await supabase
    .from("collections")
    .select("id, slug, name, description, hero_image");

  for (const c of collections ?? []) {
    const title = `${c.name} in Pakistan`;
    const description = clamp(
      c.description?.trim() ||
        `Shop ${c.name.toLowerCase()} online at ${BRAND}. Quality picks with cash on delivery and nationwide shipping across Pakistan.`,
      160,
    );
    const keywords = [
      `${c.name} Pakistan`,
      `buy ${c.name.toLowerCase()} online`,
      "online shopping Pakistan",
      "cash on delivery",
      BRAND,
      c.slug,
    ];
    const og = (c.hero_image || "").trim() || defaultOg;
    const ogAlt = `${c.name} collection — ${BRAND}`;

    const { data: existing } = await supabase
      .from("seo_meta")
      .select("id")
      .eq("subject_type", "collection")
      .eq("subject_id", c.id)
      .eq("locale", "en")
      .maybeSingle();

    const payload = {
      title,
      description,
      keywords,
      og_image_url: og,
      og_image_alt: ogAlt,
      twitter_card: "summary_large_image",
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase.from("seo_meta").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("seo_meta").insert({
        subject_type: "collection",
        subject_id: c.id,
        locale: "en",
        ...payload,
      });
    }

    if (!c.description?.trim()) {
      await supabase
        .from("collections")
        .update({
          description: `Shop ${c.name.toLowerCase()} online at ${BRAND} with COD and delivery across Pakistan.`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);
    }
  }
  console.log(`[seo] collections OG + meta: ${(collections ?? []).length}`);

  // --- Products: ensure og_image + stronger keywords/description ---
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, short_description, images, tags")
    .eq("status", "active");

  let productUpdated = 0;
  for (const p of products ?? []) {
    const img = firstImage(p.images) || defaultOg;
    const name = (p.name || "").trim();
    if (!name) continue;

    const title = clamp(`${name} in Pakistan`, 60);
    const description = clamp(
      (p.short_description || "").trim() ||
        `Buy ${name} online at ${BRAND}. Cash on delivery and nationwide shipping across Pakistan.`,
      160,
    );
    const tagList = Array.isArray(p.tags)
      ? p.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "")
      : [];
    const keywords = [
      name,
      `${name} Pakistan`,
      `buy ${name} online`,
      "online shopping Pakistan",
      "cash on delivery",
      BRAND,
      ...tagList.slice(0, 3),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const { data: existing } = await supabase
      .from("seo_meta")
      .select("id, og_image_url, title, description")
      .eq("subject_type", "product")
      .eq("subject_id", p.id)
      .eq("locale", "en")
      .maybeSingle();

    const payload = {
      title: existing?.title?.trim() || title,
      description: existing?.description?.trim() || description,
      keywords,
      og_image_url: existing?.og_image_url?.trim() || img,
      og_image_alt: `${name} — ${BRAND}`,
      twitter_card: "summary_large_image",
      updated_at: new Date().toISOString(),
    };

    // Always refresh keywords + og alt; fill empty og/title/desc
    if (existing?.id) {
      await supabase
        .from("seo_meta")
        .update({
          keywords: payload.keywords,
          og_image_url: payload.og_image_url,
          og_image_alt: payload.og_image_alt,
          title: payload.title,
          description: payload.description,
          twitter_card: "summary_large_image",
          updated_at: payload.updated_at,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("seo_meta").insert({
        subject_type: "product",
        subject_id: p.id,
        locale: "en",
        ...payload,
      });
    }
    productUpdated += 1;
  }
  console.log(`[seo] products refreshed: ${productUpdated}`);

  // --- Policy pages SEO ---
  const { data: policies } = await supabase
    .from("policy_pages")
    .select("id, slug, title, is_published");

  for (const pol of policies ?? []) {
    if (!pol.is_published) continue;
    const title = `${pol.title}`.trim();
    const description = clamp(
      `Read the ${title} for ${BRAND}. Clear shopping rules for orders and delivery across Pakistan.`,
      160,
    );
    const { data: existing } = await supabase
      .from("seo_meta")
      .select("id")
      .eq("subject_type", "policy_page")
      .eq("subject_id", pol.id)
      .eq("locale", "en")
      .maybeSingle();
    const payload = {
      title,
      description,
      keywords: [title, "SimpleCart Store policy", "Pakistan shopping policy"],
      og_image_url: defaultOg,
      og_image_alt: defaultOgAlt,
      twitter_card: "summary_large_image",
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      await supabase.from("seo_meta").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("seo_meta").insert({
        subject_type: "policy_page",
        subject_id: pol.id,
        locale: "en",
        ...payload,
      });
    }
  }
  console.log(`[seo] policies: ${(policies ?? []).filter((p) => p.is_published).length}`);

  // --- Social sameAs: ensure Facebook/Instagram placeholders only if empty? Skip inventing fake socials.
  const { data: socials } = await supabase
    .from("seo_social_profiles")
    .select("id, platform, url, is_active")
    .eq("is_active", true);
  console.log(`[seo] active social profiles: ${(socials ?? []).length} (left as-is)`);

  console.log("[seo] Strengthen complete. Verification tokens still need GSC/Meta (cannot invent).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
