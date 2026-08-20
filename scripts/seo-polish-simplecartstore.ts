/**
 * One-shot SEO polish for SimpleCart Store (home / kitchen / drinkware / beauty niche).
 *
 * - Shortens awkward product names
 * - Rewrites short_description
 * - Upserts seo_meta (title / description / keywords) for every product + key routes + collection
 * - Strengthens store_settings site title/description
 *
 *   npx tsx scripts/seo-polish-simplecartstore.ts
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
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
const BRAND = "SimpleCart Store";
const BRAND_SHORT = "SimpleCart";

type ProductRow = { id: string; slug: string; name: string };

/** Manual short titles for known awkward catalog names (slug → short name). */
const SHORT_BY_SLUG: Record<string, string> = {
  "2-in-1-rechargeable-hair-remover-eyebrow-trimmer-with-led-painless-precision-sha":
    "LED Eyebrow Trimmer & Hair Remover",
  "1-8-liter-large-stainless-steel-water-pitcher-jug-drinks-juice-beverage-jugs":
    "1.8L Stainless Steel Water Pitcher",
  "1000ml-stainless-steel-thermos-water-bottle": "1L Stainless Steel Thermos Bottle",
  "100w-rechargeable-solar-led-construction-site-light-outdoor-waterproof-pir-motio":
    "100W Solar LED Work Light",
  "100w-rechargeable-solar-led-construction-site-light-outdoor-waterproof-pir-motio-p97l":
    "100W Solar LED Work Light (PIR)",
  "12-pcs-silicone-cooking-utensils-kitchen-utensil-set-heat-resistant-non-toxic-bp":
    "12-Piece Silicone Kitchen Utensil Set",
  "1-litter-plastic-jug-for-water-and-juice-with-4-cups-water-jugs-juice-jug-random":
    "1L Plastic Jug with 4 Cups",
  "1pc-air-tight-bow-round-square-glass-juice-mug-jar-high-quality-borosilicate-can":
    "Airtight Borosilicate Glass Jar",
  "220v-4w-mosquito-killer-lamp-led-lamp-insect-killer-bug-zapper-anti-mosquito-tra":
    "4W LED Mosquito Killer Lamp",
  "220v-mosquito-killer-8w-12w-lamp-led-lamp-insect-killer-bug-zapper-anti-mosquito":
    "8W–12W LED Mosquito Killer Lamp",
  "24-pcs-premium-stainless-steel-dining-cutlery-set-golden-black-and-full-golden":
    "24-Piece Golden Cutlery Set",
  "24pcs-set-stainless-steel-cutlery-set-with-holder-gift-box-perfect-tableware-set":
    "24-Piece Cutlery Set with Holder",
  "304-stainless-steel-double-layer-vacuum-insulated-cup-portable-car-and-sports-wa":
    "304 Vacuum Insulated Travel Cup",
  "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma":
    "450ml Car Heating Cup 12V/24V",
  "5-blade-multi-vegetable-fruits-cutter-chopper-slicer":
    "5-Blade Vegetable & Fruit Chopper",
  "5-in-1-electric-blackhead-acne-oil-remover-vacuum-suction-face-pore-cleaner-faci":
    "5-in-1 Blackhead Remover Vacuum",
  "5-piece-cooking-tools-and-utensils-silicone-baking-set-heat-resistant-non-stick-":
    "5-Piece Silicone Baking Set",
  "500ml-double-layer-glass-material-plastic-coated-office-cup":
    "500ml Double-Wall Office Glass Cup",
  "500ml-transparent-glass-cup-exquisite-heat-resistant-tumbler-tea-juice-milk-coff":
    "500ml Heat-Resistant Glass Tumbler",
  "bear-glass-cup-with-lid-transparent-glass-straw-mug-diamond-cup-suitable-for-hom":
    "Bear Glass Cup with Lid & Straw",
  "bubble-ribbed-round-glass-sipper-with-glass-straw-tumbler-can-lid-ribbed-square-":
    "Ribbed Glass Sipper with Straw",
  "cartoon-bear-shaped-coffee-mug-cute-bear-mug-glass-cup-with-straw-transparent-cr":
    "Cartoon Bear Glass Coffee Mug",
  "cartoon-bear-shaped-coffee-mug-cute-bear-mug-glass-cup-with-straw-transparent-cr-pe2l":
    "Cartoon Bear Coffee Mug with Straw",
  "lovely-cartoon-rabbit-350ml-water-cup-high-quality-portable-glass-cup-cartoon-si":
    "350ml Cartoon Rabbit Glass Cup",
  "lovely-cartoon-rabbit-350ml-water-cup-high-quality-portable-glass-cup-cartoon-si-kg4z":
    "350ml Rabbit Glass Cup with Straw",
  "lovely-cartoon-rabbit-350ml-water-cup-high-quality-portable-glass-cup-cartoon-si-oqym":
    "350ml Cute Rabbit Sipper Cup",
  "chopper-2l-heavy-duty-stainless-steel-manual-food-cutter-easy-meat-veg-prep":
    "2L Manual Food Chopper",
  "creative-coffee-mug-heat-resistant-glass-mug-with-handle-water-cups-milk-juice-b":
    "Heat-Resistant Glass Coffee Mug",
  "coffee-tea-travel-camera-lens-coffee-mug-stainless-steel-thermos-cup":
    "Camera Lens Travel Thermos Mug",
  "colorful-drinking-kunststof-straws-bar-party-wedding-kitchen-pajitas-plastic-bev":
    "Reusable Colorful Plastic Straws",
  "crystal-lamp-rose-diamond-table-lamp-16-colors-rgb-with-touch-and-remote-control":
    "RGB Crystal Diamond Table Lamp",
  "crystal-lamp-rose-diamond-table-lamp-16-colors-rgb-with-touch-and-remote-control-k8fr":
    "RGB Crystal Rose Table Lamp",
  "crystal-lamp-rose-diamond-table-lamp-16-colors-rgb-with-touch-and-remote-control-omw6":
    "16-Color RGB Crystal Lamp",
  "new-cute-cute-cups-korean-students-creative-portable-high-temperature-resistant-":
    "Cute Heat-Resistant Glass Cup",
  "double-wall-high-borosilicate-glass-cup-with-handle-heat-resistant-sea-snail-diy":
    "Double-Wall Borosilicate Glass Cup",
  "imported-double-wall-mug-350ml-high-quality-a-thermal-shock-borosilicate-mug-for":
    "350ml Double-Wall Borosilicate Mug",
  "electric-egg-beater-machine-hand-mixer-handheld-cake-egg-beater-cream-blender-ca":
    "Handheld Electric Egg Beater",
  "imported-electric-kettle-2l-1500w-stainless-steel-with-advanced-automatic-switch":
    "2L Stainless Steel Electric Kettle",
  "imported-electric-kettle-2l-1500w-stainless-steel-with-advanced-automatic-switch-ovlw":
    "2L Auto-Off Electric Kettle",
  "electric-kettle-egg-boiler-multifunctional-noodles-maker-1-2-litter-food-warmer-":
    "Multifunction Kettle & Egg Boiler",
  "electric-kettle-egg-boiler-multifunctional-noodles-maker-1-2-litter-food-warmer--phqg":
    "1.2L Multifunction Food Warmer Kettle",
  "electric-room-heater-electric-heater-with-safety-switch-energy-saving-foldable-h":
    "400W Foldable Electric Room Heater",
  "electric-stove-single-electric-heater-compact-and-efficient-cooking-solution-100":
    "1000W Single Electric Stove",
  "electric-toothbrush-for-teeth-brushes-6-modes-dental-tooth-whitening-cleaner-ip6":
    "6-Mode Electric Toothbrush",
  "european-hotel-kitchen-rectangular-fancy-table-facial-tissue-box-cover-holder":
    "Rectangular Tissue Box Holder",
  "foldable-wax-heater-hair-removal-wax-machine-portable-silicone-wax-warmer-400ml-":
    "400ml Foldable Wax Warmer",
  "folding-makeup-mirror-led-lights-dorm-dressing-mirror-beauty-light-up-your-fill-":
    "LED Folding Makeup Mirror",
  "glass-tumbler-with-straw-lid-leather-sleeve-masson-jars-slub-glass-reusable-eco-":
    "Glass Tumbler with Straw & Sleeve",
  "professional-hair-straightener-temperature-control-option-ceramic-tourmaline-pla":
    "Ceramic Tourmaline Hair Straightener",
  "household-clothes-shaver-fabric-lint-remover-fuzz-electric-fluff-portable-brush-":
    "Electric Fabric Lint Remover",
  "kitchen-seasoning-syringe-bbq-meat-marinade-injector-with-turkey-chicken-sauce-s":
    "BBQ Meat Marinade Injector",
  "lavashak-fruit-leather-sheet-roll-pack-of-6-sour-cherry-pomegranate-and-blackber":
    "Fruit Leather Sheet Roll (6 Pack)",
  "new-long-plasma-lighter-electric-kitchen-lighter-bbq-long-stick-plasma-candle-li":
    "Long Plasma Kitchen Lighter",
  "hot-selling-mason-cock-mug-colorful-glass-coffee-juice-milk-tea-beer-water-mug-c":
    "Colorful Mason Glass Mug",
  "hot-selling-mason-cock-mug-colorful-glass-coffee-juice-milk-tea-beer-water-mug-c-ozzy":
    "Colorful Mason Coffee Mug",
  "mini-14oz-stainless-steel-tumbler-insulation-coffee-cup-water-bottle-mug-with-st":
    "14oz Mini Stainless Steel Tumbler",
  "mini-colorful-cartoon-alarm-clock-for-students-and-children-home-bedside-persona":
    "Mini Cartoon Kids Alarm Clock",
  "mini-electric-coffee-grinder-machine-original-330gm-garam-masala-grinder-machine":
    "Mini Electric Coffee & Spice Grinder",
  "neck-shoulder-massager-n7-kneading-massager-shawl-3-level-modes-neck-cervical-wa":
    "N7 Neck & Shoulder Massager",
  "one-step-3-in-1-hair-dryer-styler-hair-dryer-brush-hot-air-brush-hair-volumizer-":
    "3-in-1 Hot Air Hair Dryer Brush",
  "panda-led-night-light-cute-silicone-night-light-usb-rechargeable-touch-night-lam":
    "Panda Silicone LED Night Light",
  "pastel-water-bottle-700ml-shaker-water-bottle-with-sticker-cute-plastic-tea-milk":
    "700ml Pastel Shaker Water Bottle",
  "imported-cute-girl-transparent-glass-heat-resistant-tumbler-with-pearl-chain-sip":
    "Pearl Chain Glass Tumbler",
  "period-cramp-relief-belt-portable-menstrual-heating-pad-heated-belly-belt-for-me":
    "Period Cramp Relief Heating Belt",
  "plastic-desktop-clock-for-kids-room-bedroom-office-mini-small-nightstand-candy-c":
    "Mini Desktop Kids Alarm Clock",
  "portable-silicone-wax-warmer-300ml-foldable-wax-heater-hair-removal-wax-machine-":
    "300ml Foldable Silicone Wax Warmer",
  "portable-silicone-wax-warmer-300ml-foldable-wax-heater-hair-removal-wax-machine--p4un":
    "300ml Portable Wax Heater",
  "rainbow-color-stainless-steel-straws-metal-straw-for-drinking-juice-eco-friendly":
    "Rainbow Stainless Steel Straws",
  "rechargeable-mosquito-killer-racket-insect-zapper-2-in-1":
    "2-in-1 Mosquito Killer Racket",
  "ribbed-round-glass-sipper-with-glass-straw-tumbler-can-lid-ribbed-square-glass-m":
    "Ribbed Round Glass Sipper",
  "ribbed-tumbler-glass-improted-glass-cups-model-12oz-or-16oz-drinking-glasses-wit":
    "12oz Ribbed Glass Tumbler",
  "round-shape-glass-with-glass-straw-and-wooden-lid-coffee-glass-milk-glass-juice-":
    "Round Glass Cup with Wooden Lid",
  "sports-vacuum-flask-water-bottle-750ml-stainless-steel-hot-and-cold-thermos":
    "750ml Sports Vacuum Flask",
  "stainless-steel-2-speeds-big-capacity-electric-meat-grinder-food-processor-compa":
    "2-Speed Electric Meat Grinder",
  "stainless-steel-2-speeds-big-capacity-electric-meat-grinder-food-processor-compa-09ue":
    "Electric Meat Grinder & Processor",
  "stainless-steel-slim-hot-and-cold-water-bottle-flask-500-ml-with-leatherbag":
    "500ml Slim Hot & Cold Flask",
  "stainless-steel-slim-hot-and-cold-water-bottle-flask-500-ml-with-leatherbag-zm3u":
    "500ml Slim Flask with Sleeve",
  "creative-starry-sky-projection-humidifier-mini-rotating-car-air-humidifier-with-":
    "Starry Sky Projection Humidifier",
  "steel-lid-jug-gph-27-high-quality-borosilicate-made-can-use-for-juices-beverages":
    "Borosilicate Steel-Lid Juice Jug",
  "sun-halogen-dish-heater-300w-600w-portable-electric-room-heater-apple-shape-desi":
    "300W–600W Halogen Dish Heater",
  "sun-halogen-dish-heater-electric-energy-efficient-300-600-watt":
    "Sun Halogen Portable Room Heater",
  "temperature-water-bottle-led-temperature-display-hot-cold-vacuum-flasks-stainless-steel-thermos-led-500ml-smart-thermos":
    "500ml LED Temperature Water Bottle",
  "thinkerz-rechargeable-electronic-mosquito-killer-bat-racket-insect-killer":
    "Rechargeable Mosquito Killer Bat",
  "transparent-trimmer-for-men-hair-and-beard-shaver-machine-for-men-rechargeable-t":
    "Rechargeable Men Hair & Beard Trimmer",
  "trending-hand-held-whole-body-body-massager-fat-and-cellulite-vibrator-roller-ab":
    "Handheld Full-Body Massager",
  "tumbler-bottle-1200ml": "1200ml Large Tumbler Bottle",
  "turbo-jet-blower-portable-21v-car-blower-with-battery-40-mins-battery-timing-cor":
    "21V Portable Turbo Jet Blower",
  "ultrasonic-humidifier-2-6l-room-office-home-air-purifier-aroma-diffuser-air-fres":
    "2.6L Ultrasonic Humidifier",
  "imported-water-bottle-350-ml-elegant-design-with-straw-easy-to-use-best-water-bo":
    "350ml Water Bottle with Straw",
  "water-bottle-steel-water-bottle-temperature-water-bottle-vaccum-bottle-stainless-steel-vacuum-insulated-thermos-800ml-1pcs-stainless-steel-thermal-bottle-for-hot-and-cold-beverages-with-coffee-water-cup":
    "800ml Vacuum Insulated Steel Bottle",
};

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

function titleCaseKeepUnits(s: string): string {
  return s
    .split(" ")
    .map((w) => {
      if (/^\d/.test(w) || /^(ml|l|oz|w|v|pcs?|in|led|rgb|usb|pir)$/i.test(w)) return w;
      if (w === w.toUpperCase() && w.length <= 4) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Heuristic short name when no manual map exists. */
function shortenName(name: string, slug: string): string {
  if (SHORT_BY_SLUG[slug]) return SHORT_BY_SLUG[slug];

  let n = name
    .replace(/\*/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Drop duplicated capacity like "1.8 Liter ... 1.8L"
  n = n.replace(/\b(\d+(?:\.\d+)?)\s*(?:liter|litre|l)\b(.*)\b\1\s*l\b/i, "$1L$2");

  const junk =
    /\b(imported|exquisite|premium|perfect|high quality|high-quality|everyday|new cute|trending|kunststof|pajitas|suitable for|with advanced|compact and efficient cooking solution)\b/gi;
  n = n.replace(junk, " ").replace(/\s+/g, " ").trim();

  // Prefer first ~6–8 meaningful tokens
  const words = n.split(" ").filter(Boolean);
  if (words.length > 8) n = words.slice(0, 7).join(" ");
  if (n.length > 55) n = clamp(n, 52).replace(/…$/, "").trim();

  return titleCaseKeepUnits(n);
}

function categoryHint(slug: string, name: string): string {
  const s = `${slug} ${name}`.toLowerCase();
  if (/bottle|flask|thermos|tumbler|sipper|pitcher|jug|straw|mug|cup|drinkware/.test(s))
    return "durable drinkware";
  if (/kettle|stove|chopper|cutlery|utensil|cooking|baking|marinade|egg beater|mixer/.test(s))
    return "practical kitchen essentials";
  if (/mosquito|bug|zapper|insect/.test(s)) return "home pest control";
  if (/heater|wax warmer|halogen|humidifier|massager|cramp/.test(s))
    return "home comfort essentials";
  if (/hair|blackhead|makeup|mirror|toothbrush|trimmer|wax|beauty/.test(s))
    return "beauty & personal care";
  if (/lamp|light|solar|night/.test(s)) return "home lighting";
  return "everyday home essentials";
}

function keywordsFor(shortName: string, slug: string): string[] {
  const base = [
    shortName.toLowerCase(),
    `${shortName} Pakistan`,
    `buy ${shortName} online`,
    "online shopping Pakistan",
    BRAND,
    "cash on delivery Pakistan",
  ];
  const s = slug.toLowerCase();
  if (/bottle|flask|tumbler|thermos/.test(s)) {
    base.push("water bottle Pakistan", "thermos bottle", "stainless steel bottle");
  }
  if (/kettle/.test(s)) base.push("electric kettle Pakistan", "kitchen appliances");
  if (/mosquito/.test(s)) base.push("mosquito killer lamp", "insect killer Pakistan");
  if (/cutlery|utensil/.test(s)) base.push("kitchen utensils Pakistan", "cutlery set");
  if (/hair|beauty|wax|makeup/.test(s)) base.push("beauty tools Pakistan", "personal care");
  return [...new Set(base.map((k) => k.trim()).filter(Boolean))].slice(0, 12);
}

function seoTitle(shortName: string): string {
  const withPk = `${shortName} in Pakistan | ${BRAND_SHORT}`;
  if (withPk.length <= 70) return withPk;
  const buy = `${shortName} – Buy Online PK`;
  if (buy.length <= 70) return buy;
  return clamp(shortName, 70);
}

function seoDescription(shortName: string, hint: string): string {
  return clamp(
    `Buy ${shortName} online at ${BRAND}. ${hint[0].toUpperCase()}${hint.slice(1)} with fast nationwide delivery and cash on delivery across Pakistan.`,
    160,
  );
}

function shortDescription(shortName: string, hint: string): string {
  return clamp(
    `${shortName} — ${hint} from ${BRAND}. Order online with delivery across Pakistan.`,
    220,
  );
}

async function main() {
  if (!url) fail("Missing SUPABASE URL");
  if (!serviceKey) fail("Missing SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey);
  const rows = JSON.parse(
    readFileSync(resolve(__dirname, "_products-rows.json"), "utf8"),
  ) as ProductRow[];

  console.log(`[seo-polish] Products: ${rows.length}`);

  let updatedProducts = 0;
  let upsertedSeo = 0;

  for (const p of rows) {
    const short = shortenName(p.name, p.slug);
    const hint = categoryHint(p.slug, short);
    const shortDesc = shortDescription(short, hint);
    const title = seoTitle(short);
    const description = seoDescription(short, hint);
    const keywords = keywordsFor(short, p.slug);

    const { error: pErr } = await supabase
      .from("products")
      .update({
        name: short,
        short_description: shortDesc,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);

    if (pErr) {
      console.error("[seo-polish] product", p.slug, pErr.message);
      fail(pErr.message);
    }
    updatedProducts++;

    const { error: sErr } = await supabase.from("seo_meta").upsert(
      {
        subject_type: "product",
        subject_id: p.id,
        subject_key: null,
        locale: "en",
        title,
        description,
        keywords,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "subject_type,subject_id,locale" },
    );

    if (sErr) {
      // Unique constraint name may differ; try subject_key path as fallback insert update
      const { data: existing } = await supabase
        .from("seo_meta")
        .select("id")
        .eq("subject_type", "product")
        .eq("subject_id", p.id)
        .eq("locale", "en")
        .maybeSingle();

      if (existing?.id) {
        const { error: uErr } = await supabase
          .from("seo_meta")
          .update({ title, description, keywords, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (uErr) fail(`seo update ${p.slug}: ${uErr.message}`);
      } else {
        const { error: iErr } = await supabase.from("seo_meta").insert({
          subject_type: "product",
          subject_id: p.id,
          locale: "en",
          title,
          description,
          keywords,
        });
        if (iErr) fail(`seo insert ${p.slug}: ${iErr.message} / upsert: ${sErr.message}`);
      }
    }
    upsertedSeo++;
    if (updatedProducts % 15 === 0) {
      console.log(`[seo-polish] … ${updatedProducts}/${rows.length}`);
    }
  }

  // Store settings
  const siteTitle = "SimpleCart Store";
  const siteDescription = clamp(
    "Shop water bottles, tumblers, kitchen tools, beauty gadgets and home essentials online in Pakistan. Fair prices, COD, and nationwide delivery from SimpleCart Store.",
    160,
  );
  await supabase
    .from("store_settings")
    .update({
      store_name: siteTitle,
      site_title: siteTitle,
      site_description: siteDescription,
    })
    .eq("id", 1);

  // Collection: Water Bottles
  const { data: col } = await supabase
    .from("collections")
    .select("id")
    .eq("slug", "water-bottles")
    .maybeSingle();

  if (col?.id) {
    await supabase
      .from("collections")
      .update({
        name: "Water Bottles & Drinkware",
        description:
          "Stainless steel flasks, glass tumblers, sippers, and everyday water bottles — hot & cold options with delivery across Pakistan.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", col.id);

    const colTitle = "Water Bottles & Drinkware in Pakistan | SimpleCart";
    const colDesc = clamp(
      "Shop stainless steel water bottles, thermos flasks, glass tumblers and sippers online in Pakistan. Hot & cold drinkware with COD from SimpleCart Store.",
      160,
    );
    const colKw = [
      "water bottles Pakistan",
      "thermos bottle",
      "stainless steel flask",
      "glass tumbler Pakistan",
      "buy water bottle online",
      "drinkware Pakistan",
      BRAND,
    ];

    const { data: colSeo } = await supabase
      .from("seo_meta")
      .select("id")
      .eq("subject_type", "collection")
      .eq("subject_id", col.id)
      .eq("locale", "en")
      .maybeSingle();

    if (colSeo?.id) {
      await supabase
        .from("seo_meta")
        .update({
          title: colTitle,
          description: colDesc,
          keywords: colKw,
          updated_at: new Date().toISOString(),
        })
        .eq("id", colSeo.id);
    } else {
      await supabase.from("seo_meta").insert({
        subject_type: "collection",
        subject_id: col.id,
        locale: "en",
        title: colTitle,
        description: colDesc,
        keywords: colKw,
      });
    }
  }

  // Key routes
  const routes: {
    key: string;
    title: string;
    description: string;
    keywords: string[];
  }[] = [
    {
      key: "/",
      title: "Home Essentials Online Pakistan | SimpleCart Store",
      description: clamp(
        "Buy water bottles, kitchen tools, beauty gadgets and home essentials online in Pakistan. Quality picks, fair prices, COD and nationwide delivery.",
        160,
      ),
      keywords: [
        "online shopping Pakistan",
        "home essentials Pakistan",
        "water bottles Pakistan",
        "kitchen accessories",
        "beauty tools Pakistan",
        "SimpleCart Store",
        "cash on delivery",
      ],
    },
    {
      key: "/collections",
      title: "Shop Home & Kitchen Products | SimpleCart Store",
      description: clamp(
        "Browse drinkware, kitchen tools, beauty gadgets, heaters and home essentials at SimpleCart Store. Curated catalog with delivery across Pakistan.",
        160,
      ),
      keywords: [
        "shop all products Pakistan",
        "home essentials online",
        "kitchen accessories Pakistan",
        "drinkware Pakistan",
        BRAND,
      ],
    },
    {
      key: "/contact",
      title: "Contact SimpleCart Store | Customer Support Pakistan",
      description: clamp(
        "Need help with orders, delivery or products? Contact SimpleCart Store support for fast assistance across Pakistan.",
        160,
      ),
      keywords: [
        "contact SimpleCart Store",
        "customer support Pakistan",
        "order help",
        "online store support",
      ],
    },
    {
      key: "/search",
      title: "Search Home & Kitchen Products | SimpleCart Store",
      description: clamp(
        "Search water bottles, tumblers, kitchen tools, beauty gadgets and home essentials at SimpleCart Store.",
        160,
      ),
      keywords: ["search products", "SimpleCart Store", "home essentials Pakistan"],
    },
    {
      key: "/collections/sale",
      title: "Sale on Home Essentials | SimpleCart Store Pakistan",
      description: clamp(
        "Save on water bottles, kitchen tools and beauty gadgets. Shop sale deals at SimpleCart Store with delivery across Pakistan.",
        160,
      ),
      keywords: ["sale Pakistan", "home essentials deals", "SimpleCart Store sale"],
    },
    {
      key: "/bundles",
      title: "Product Bundles & Combos | SimpleCart Store",
      description: clamp(
        "Shop curated home and kitchen bundles at SimpleCart Store — convenient combos with nationwide delivery in Pakistan.",
        160,
      ),
      keywords: ["product bundles Pakistan", "combo deals", BRAND],
    },
  ];

  for (const r of routes) {
    const { data: existing } = await supabase
      .from("seo_meta")
      .select("id")
      .eq("subject_type", "route")
      .eq("subject_key", r.key)
      .eq("locale", "en")
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("seo_meta")
        .update({
          title: r.title,
          description: r.description,
          keywords: r.keywords,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("seo_meta").insert({
        subject_type: "route",
        subject_key: r.key,
        locale: "en",
        title: r.title,
        description: r.description,
        keywords: r.keywords,
      });
    }
  }

  // Policy pages: strengthen brand in titles if generic
  const { data: policies } = await supabase
    .from("seo_meta")
    .select("id, title, description")
    .eq("subject_type", "policy_page")
    .eq("locale", "en");

  for (const pol of policies ?? []) {
    if (!pol.title?.includes(BRAND) && !pol.title?.includes("SimpleCart")) {
      await supabase
        .from("seo_meta")
        .update({
          title: clamp(`${pol.title.replace(/\s*\|\s*.*$/, "")} | ${BRAND}`, 70),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pol.id);
    }
  }

  console.log(
    `[seo-polish] Done. products=${updatedProducts} seo_rows=${upsertedSeo} routes=${routes.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
