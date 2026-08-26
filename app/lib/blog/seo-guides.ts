import type { Product } from "@/app/lib/catalog/types";
import type { BlogArticle, BlogImage, BlogSection } from "@/app/lib/blog/product-blog";
import {
  getStaticGuideMeta,
  pickGuideImages,
  type StaticGuideMeta,
} from "@/app/lib/blog/guides";

const STORY = {
  kettleQc: {
    src: "/story/simplecart-store-01.jpg",
    alt: "Stainless steel electric kettle prepared for packing at SimpleCart Store",
  },
  heaterDrinkware: {
    src: "/story/simplecart-store-02.jpg",
    alt: "Carbon heater and drinkware from SimpleCart Store home essentials range",
  },
  lifestyleJar: {
    src: "/story/simplecart-store-03.jpg",
    alt: "Glass storage jar and lifestyle accessories available at SimpleCart Store",
  },
  tumblerPack: {
    src: "/story/simplecart-store-04.jpg",
    alt: "Glass tumbler with bamboo lid packed with protective wrap for shipping",
  },
  fanHeater: {
    src: "/story/simplecart-store-05.jpg",
    alt: "Portable fan heater from SimpleCart Store appliance collection",
  },
  warehouseBusy: {
    src: "/story/simplecart-store-06.jpg",
    alt: "SimpleCart Store warehouse inventory of household goods for nationwide delivery",
  },
  cartonStacks: {
    src: "/story/simplecart-store-07.jpg",
    alt: "Cartons of ready-to-dispatch inventory at SimpleCart Store Pakistan",
  },
  inventoryAisle: {
    src: "/story/simplecart-store-08.jpg",
    alt: "Warehouse aisle with organised product cartons at SimpleCart Store",
  },
} as const satisfies Record<string, BlogImage>;

function articleBodyText(sections: BlogSection[]): string {
  return sections
    .map((s) => {
      if (s.type === "paragraph" || s.type === "heading") return s.text;
      if (s.type === "list") return s.items.join(" ");
      if (s.type === "cta") return `${s.text} ${s.label}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function finalize(
  meta: StaticGuideMeta,
  hero: BlogImage,
  sections: BlogSection[],
): BlogArticle {
  return {
    slug: meta.slug,
    productSlug: "",
    title: meta.title,
    metaTitle: meta.metaTitle,
    metaDescription: meta.metaDescription,
    publishedAt: meta.publishedAt,
    keywords: meta.keywords,
    hero,
    sections,
    articleBodyText: articleBodyText(sections),
  };
}

type Push = {
  pushP: (text: string) => void;
  pushH: (text: string) => void;
  pushL: (items: string[]) => void;
  pushImg: (image: BlogImage | null | undefined) => void;
  pushCta: (text: string, href: string, label: string) => void;
  sections: BlogSection[];
};

function startSections(): Push {
  const sections: BlogSection[] = [];
  return {
    sections,
    pushP: (text) => sections.push({ type: "paragraph", text }),
    pushH: (text) => sections.push({ type: "heading", text }),
    pushL: (items) => sections.push({ type: "list", items }),
    pushImg: (image) => {
      if (image) sections.push({ type: "image", image });
    },
    pushCta: (text, href, label) => sections.push({ type: "cta", text, href, label }),
  };
}

function productImg(images: BlogImage[], i: number): BlogImage | null {
  return images[i] ?? null;
}

function buildCodGuide(storeName: string, imageProducts: Product[]): BlogArticle {
  const meta = getStaticGuideMeta("cash-on-delivery-cod-simplecart-pakistan")!;
  const images = pickGuideImages(imageProducts, storeName);
  const { sections, pushP, pushH, pushL, pushImg, pushCta } = startSections();
  const hero = STORY.tumblerPack;

  pushP(
    `Cash on delivery (COD) is one of the most trusted ways to shop online in Pakistan. At ${storeName}, you can browse home essentials, place an order, and pay in PKR when the parcel reaches your door — where COD is shown at checkout.`,
  );
  pushP(
    `This guide explains how COD works on our store, what to expect after checkout, and how to place your first order with confidence.`,
  );

  pushH("What is cash on delivery?");
  pushP(
    `With COD, you do not pay online before the parcel arrives. You confirm the order on the website, we pack and dispatch from our inventory, and you pay the courier (or collection agent) in cash when you receive the package — according to the total shown at checkout.`,
  );

  pushImg(STORY.cartonStacks);
  pushImg(productImg(images, 0));

  pushH("How COD works at SimpleCart Store");
  pushL([
    "Add products to your cart and go to checkout.",
    "Enter your name, phone number and complete delivery address in Pakistan.",
    "Choose cash on delivery when it is offered for your order.",
    "Place the order — you will see a confirmation on screen.",
    "We pick, pack and hand the parcel to the courier.",
    "When it arrives, check the parcel and pay the amount due in PKR.",
  ]);

  pushH("Why Pakistani shoppers prefer COD");
  pushL([
    "Pay only when the order arrives — lower risk on a first purchase.",
    "Transparent PKR totals at checkout before you confirm.",
    "Useful for home, kitchen and appliance essentials you want to see before settling payment.",
  ]);

  pushImg(productImg(images, 1));

  pushH("Tips for a smooth COD order");
  pushL([
    "Use an active phone number — couriers often call before delivery.",
    "Write the full address with area, city and nearby landmark.",
    "Keep the checkout total in mind so you have cash ready.",
    "New users can apply WELCOME10 at checkout when eligible for a Rs 100 welcome bonus.",
  ]);

  pushH("Frequently asked questions");
  pushP(
    `Is COD available everywhere? COD is offered across Pakistan where shown at checkout for your cart and address. If another method is required, checkout will make that clear.`,
  );
  pushP(
    `Can I use a voucher with COD? Yes. Apply codes such as WELCOME10 before placing the order so the discounted total is what you pay on delivery.`,
  );
  pushP(
    `What if I miss the courier? Stay reachable on your phone. If a first attempt fails, follow the courier’s instructions for a reattempt or pickup where available.`,
  );

  pushCta(
    "Ready to try COD? Browse collections and checkout when you are ready.",
    "/collections",
    "Shop collections",
  );
  pushCta(
    "See how we stock and pack orders before they ship.",
    "/blogs/inside-simplecart-store-real-stock-cod-pakistan",
    "Inside our store",
  );

  return finalize(meta, hero, sections);
}

function buildDrinkwareGuide(storeName: string, imageProducts: Product[]): BlogArticle {
  const meta = getStaticGuideMeta("drinkware-buying-guide-pakistan")!;
  const images = pickGuideImages(imageProducts, storeName);
  const { sections, pushP, pushH, pushL, pushImg, pushCta } = startSections();
  const hero = images[0] ?? STORY.lifestyleJar;

  pushP(
    `The right drinkware makes daily hydration easier — at home, in the office, or on the road. This buying guide helps you choose sippers, tumblers and bottles that fit Pakistani everyday use, then shop the live catalogue at ${storeName}.`,
  );

  pushH("Start with how you drink");
  pushL([
    "Desk / office: a sipper with straw or tumbler with lid reduces spills.",
    "Gym or commute: a sealed bottle that fits in a bag or cup holder.",
    "Hot drinks on the go: insulated or car-heating style cups where you need warmth.",
    "Home hosting: clear glass tumblers that look good on the table.",
  ]);

  pushImg(productImg(images, 0));
  pushImg(STORY.tumblerPack);

  pushH("Material & build tips");
  pushP(
    `Glass looks premium and is easy to clean, but needs careful packing in transit — we wrap fragile drinkware before dispatch. Plastic or Tritan-style bottles are lighter for travel. Stainless steel suits hot and cold drinks when insulation matters.`,
  );
  pushP(
    `Check capacity (ml), whether a straw or lid is included, and whether the listing photos match what you need. Product pages on ${storeName} show PKR pricing and stock so you can compare before adding to cart.`,
  );

  pushImg(productImg(images, 1));

  pushH("What to check before you buy");
  pushL([
    "Lid seal — important if you carry the bottle in a bag.",
    "Cleaning — wide mouths are easier for daily wash.",
    "Size — match ml to how much you actually drink between refills.",
    "Use case — desk sipper vs travel bottle vs car cup.",
  ]);

  pushH("Shop drinkware at SimpleCart");
  pushP(
    `Browse our Drinkware & Tumblers collection for sippers, bottles and everyday cups. New customers can apply WELCOME10 at checkout when eligible. Orders ship with cash on delivery across Pakistan where COD is available.`,
  );

  pushCta(
    "Explore sippers, tumblers and bottles ready to order.",
    "/collections/drinkware-tumblers",
    "Shop drinkware",
  );
  pushCta("See all categories in one place.", "/collections", "All collections");

  return finalize(meta, hero, sections);
}

function buildKitchenGuide(storeName: string, imageProducts: Product[]): BlogArticle {
  const meta = getStaticGuideMeta("kitchen-essentials-pakistani-homes")!;
  const images = pickGuideImages(imageProducts, storeName);
  const { sections, pushP, pushH, pushL, pushImg, pushCta } = startSections();
  const hero = images[0] ?? STORY.kettleQc;

  pushP(
    `A practical Pakistani kitchen does not need every gadget — it needs reliable essentials you use every week. This guide highlights what is worth buying online at ${storeName}, with clear PKR pricing and COD checkout.`,
  );

  pushH("Core essentials most homes use");
  pushL([
    "Electric kettle — quick tea, coffee and instant meals.",
    "Choppers / grinders — save time on daily prep.",
    "Basic utensils and helpers — tools you reach for during cooking.",
    "Drinkware nearby — sippers and tumblers for family use.",
  ]);

  pushImg(STORY.kettleQc);
  pushImg(productImg(images, 0));

  pushH("How to choose kitchen tools online");
  pushP(
    `Read capacity, power notes and photo details on each product page. Prefer items that match how you cook: small households often need compact choppers; larger families may want bigger kettles. Avoid buying duplicates — one solid kettle beats three unused gadgets.`,
  );
  pushP(
    `Our Kitchen Essentials collection groups utensils and prep tools; Home Appliances covers kettles and related electric helpers. Cross-shop both if you are fitting out a new kitchen.`,
  );

  pushImg(productImg(images, 1));

  pushH("Buying checklist");
  pushL([
    "Confirm the item solves a real weekly task.",
    "Compare PKR price and any compare-at saving on the product page.",
    "Check stock status before relying on delivery timing.",
    "Add related items in one order when free-shipping thresholds apply.",
  ]);

  pushH("Order with confidence");
  pushP(
    `${storeName} packs kitchen goods from managed inventory. Pay with cash on delivery where shown, and use WELCOME10 on your first eligible order for a Rs 100 welcome bonus.`,
  );

  pushCta(
    "Browse utensils, choppers and kitchen helpers.",
    "/collections/kitchen-essentials",
    "Kitchen essentials",
  );
  pushCta(
    "See kettles and electric kitchen helpers.",
    "/collections/home-appliances",
    "Home appliances",
  );

  return finalize(meta, hero, sections);
}

function buildHeatersGuide(storeName: string, imageProducts: Product[]): BlogArticle {
  const meta = getStaticGuideMeta("winter-room-heaters-buying-guide-pakistan")!;
  const images = pickGuideImages(imageProducts, storeName);
  const { sections, pushP, pushH, pushL, pushImg, pushCta } = startSections();
  const hero = STORY.fanHeater;

  pushP(
    `Pakistani winters vary by city, but one need is shared: a room that feels comfortable in the evening. This guide helps you choose a room heater wisely — then shop Home Appliances at ${storeName} with COD.`,
  );

  pushH("Match the heater to your room");
  pushL([
    "Small bedroom or office nook — compact portable heaters are usually enough.",
    "Larger living space — look at higher-output options and plan placement carefully.",
    "Short evening use — portable fan-style heaters warm a zone quickly.",
    "Always leave clear space around the unit and follow the product safety notes.",
  ]);

  pushImg(STORY.fanHeater);
  pushImg(STORY.heaterDrinkware);

  pushH("Safety & power basics");
  pushP(
    `Place heaters on a stable, dry surface away from curtains, bedding and children. Do not cover the unit while it is on. Use a proper wall socket and avoid overloaded extension boards. If a listing mentions tip-over or overheat protection, treat that as a plus for home use.`,
  );
  pushP(
    `Electric heaters draw meaningful power — check your household wiring and bill expectations. Run heaters only when you are in the room, and switch off before sleep unless the product is explicitly designed and rated for supervised overnight use per its instructions.`,
  );

  pushImg(productImg(images, 0));

  pushH("What to compare on product pages");
  pushL([
    "Room size guidance vs your actual space.",
    "Portability — handle, weight, and footprint.",
    "Photos of controls and safety features.",
    "PKR price, stock, and packing notes for appliances.",
  ]);

  pushH("Shop heaters at SimpleCart");
  pushP(
    `Browse Home Appliances for heaters and related comfort products. We pack appliances carefully from warehouse inventory and offer cash on delivery across Pakistan where COD is available at checkout.`,
  );

  pushCta(
    "Browse heaters and home appliances.",
    "/collections/home-appliances",
    "Home appliances",
  );
  pushCta(
    "See how we stock and dispatch inventory.",
    "/blogs/inside-simplecart-store-real-stock-cod-pakistan",
    "Inside our store",
  );

  return finalize(meta, hero, sections);
}

function buildOrderGuide(storeName: string, imageProducts: Product[]): BlogArticle {
  const meta = getStaticGuideMeta("how-to-place-track-order-simplecart")!;
  const images = pickGuideImages(imageProducts, storeName);
  const { sections, pushP, pushH, pushL, pushImg, pushCta } = startSections();
  const hero = images[0] ?? STORY.cartonStacks;

  pushP(
    `Ordering from ${storeName} is straightforward: pick products, check out with your delivery details, choose cash on delivery where available, and wait for dispatch. This guide walks through each step and what happens after you place the order.`,
  );

  pushH("Step 1 — Browse and add to cart");
  pushL([
    "Open Collections or search for the item you need.",
    "Open the product page — check photos, PKR price and stock.",
    "Choose variants if shown, then Add to cart (or Buy now).",
    "Continue shopping or open the cart to review quantities.",
  ]);

  pushImg(productImg(images, 0));

  pushH("Step 2 — Checkout details");
  pushP(
    `Enter your full name, active mobile number and complete address (house/street, area, city). Accurate details help the courier find you on the first attempt. Review the cart subtotal, shipping line and order total before confirming.`,
  );

  pushH("Step 3 — Voucher & COD");
  pushL([
    "If you are a new eligible user, apply WELCOME10 for a Rs 100 welcome bonus.",
    "Select cash on delivery when it is offered for your order.",
    "Place the order and keep the on-screen confirmation for your records.",
  ]);

  pushImg(productImg(images, 1));
  pushImg(STORY.warehouseBusy);

  pushH("What happens after you order");
  pushL([
    "We confirm the order against warehouse stock.",
    "Items are picked and packed with protection as needed.",
    "The parcel is handed to the courier for nationwide delivery.",
    "Stay reachable by phone — couriers often call before arrival.",
    "Pay the due amount in PKR when you receive a COD order.",
  ]);

  pushH("Need more help?");
  pushP(
    `For a shorter overview, see How to Buy. For packing and inventory context, read our store operations guide. Questions about an existing order? Contact us with your name and phone number used at checkout.`,
  );

  pushCta("Read the quick How to Buy page.", "/how-to-buy", "How to buy");
  pushCta("Start shopping collections now.", "/collections", "Shop collections");
  pushCta("Message support if you need help.", "/contact", "Contact us");

  return finalize(meta, hero, sections);
}

function buildGiftGuide(storeName: string, imageProducts: Product[]): BlogArticle {
  const meta = getStaticGuideMeta("gift-ideas-under-budget-pakistan")!;
  const images = pickGuideImages(imageProducts, storeName);
  const { sections, pushP, pushH, pushL, pushImg, pushCta } = startSections();
  const hero = images[0] ?? STORY.lifestyleJar;

  pushP(
    `Good gifts in Pakistan are useful, easy to order, and fit a clear budget. This guide suggests practical home and beauty picks from ${storeName} — then links you to collections so you can choose by PKR price and order with COD.`,
  );

  pushH("Gift ideas that people actually use");
  pushL([
    "Drinkware — sippers and tumblers for students, office friends and family.",
    "Kitchen helpers — a kettle or everyday tool for a new home.",
    "Beauty gadgets — mirrors and personal-care tools for thoughtful presents.",
    "Home comfort — small appliances or seasonal items when the weather fits.",
  ]);

  pushImg(productImg(images, 0));
  pushImg(productImg(images, 1));

  pushH("How to stay under budget");
  pushP(
    `Set a max PKR amount before you browse. Filter mentally by “daily use” rather than novelty. One solid item often beats a bag of unused gadgets. If free-shipping thresholds apply, adding a second small essential can make the order better value.`,
  );
  pushP(
    `New shoppers can apply WELCOME10 at checkout when eligible — a Rs 100 welcome bonus helps stretch a gift budget.`,
  );

  pushImg(productImg(images, 2));
  pushImg(STORY.heaterDrinkware);

  pushH("Occasion ideas");
  pushL([
    "Housewarming — kitchen or drinkware essentials.",
    "Birthdays — beauty or wellness comfort picks.",
    "Eid / family visits — practical home items with clear photos to share.",
    "Office gifts — sippers and desk-friendly drinkware.",
  ]);

  pushCta("Browse drinkware gift picks.", "/collections/drinkware-tumblers", "Drinkware");
  pushCta(
    "Browse beauty & personal care.",
    "/collections/beauty-personal-care",
    "Beauty & personal care",
  );
  pushCta("See everything in one hub.", "/collections", "All collections");

  return finalize(meta, hero, sections);
}

function buildTrustGuide(storeName: string, imageProducts: Product[]): BlogArticle {
  const meta = getStaticGuideMeta("returns-trust-why-buy-simplecart")!;
  const images = pickGuideImages(imageProducts, storeName);
  const { sections, pushP, pushH, pushL, pushImg, pushCta } = startSections();
  const hero = STORY.inventoryAisle;

  pushP(
    `Shopping online is easier when you know who is behind the cart. Here is why customers choose ${storeName}: selective home essentials, managed warehouse stock, careful packing, cash on delivery, and clear help paths if something goes wrong.`,
  );

  pushH("What trust looks like at SimpleCart");
  pushL([
    "Catalogue tied to inventory we prepare for dispatch.",
    "Product pages with real photos and transparent PKR pricing.",
    "Packing protection for fragile items before courier handover.",
    "COD across Pakistan where shown at checkout.",
    "About Us and store-story pages that show how we work.",
  ]);

  pushImg(STORY.warehouseBusy);
  pushImg(STORY.tumblerPack);

  pushH("Purchase protection & help");
  pushP(
    `We aim for careful fulfilment, but if something is wrong with an order, contact us promptly with your name, phone number and order details. Review Purchase Protection for how we support shoppers, and Policies for store terms.`,
  );
  pushP(
    `For packing and warehouse context, our Inside SimpleCart Store guide shows the inventory and dispatch process behind COD delivery.`,
  );

  pushImg(productImg(images, 0));
  pushImg(STORY.cartonStacks);

  pushH("Why buy here for everyday essentials");
  pushP(
    `${storeName} focuses on useful products for Pakistani homes — drinkware, kitchen tools, small appliances, beauty and wellness — not endless low-quality clutter. Start with collections, apply WELCOME10 if you are an eligible new user, and pay on delivery when COD is available.`,
  );

  pushCta("Read purchase protection.", "/purchase-protection", "Purchase protection");
  pushCta("Meet the store & mission.", "/about", "About us");
  pushCta("Browse collections and order.", "/collections", "Shop collections");
  pushCta("Need help with an order?", "/contact", "Contact us");

  return finalize(meta, hero, sections);
}

const SEO_GUIDE_BUILDERS: Record<
  string,
  (storeName: string, imageProducts: Product[]) => BlogArticle
> = {
  "cash-on-delivery-cod-simplecart-pakistan": buildCodGuide,
  "drinkware-buying-guide-pakistan": buildDrinkwareGuide,
  "kitchen-essentials-pakistani-homes": buildKitchenGuide,
  "winter-room-heaters-buying-guide-pakistan": buildHeatersGuide,
  "how-to-place-track-order-simplecart": buildOrderGuide,
  "gift-ideas-under-budget-pakistan": buildGiftGuide,
  "returns-trust-why-buy-simplecart": buildTrustGuide,
};

export const SEO_GUIDE_SLUGS = Object.keys(SEO_GUIDE_BUILDERS);

export function buildSeoGuideArticle(
  slug: string,
  storeName: string,
  imageProducts: Product[],
): BlogArticle | null {
  const builder = SEO_GUIDE_BUILDERS[slug];
  if (!builder) return null;
  return builder(storeName, imageProducts);
}

export function seoGuideCrumbLabel(slug: string): string {
  const labels: Record<string, string> = {
    "cash-on-delivery-cod-simplecart-pakistan": "Cash on delivery",
    "drinkware-buying-guide-pakistan": "Drinkware guide",
    "kitchen-essentials-pakistani-homes": "Kitchen essentials",
    "winter-room-heaters-buying-guide-pakistan": "Room heaters guide",
    "how-to-place-track-order-simplecart": "How to order",
    "gift-ideas-under-budget-pakistan": "Gift ideas",
    "returns-trust-why-buy-simplecart": "Why buy from us",
  };
  return labels[slug] ?? "Guide";
}
