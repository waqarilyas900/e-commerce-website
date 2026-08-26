import type { Product } from "@/app/lib/catalog/types";
import type { BlogArticle, BlogImage, BlogSection } from "@/app/lib/blog/product-blog";

export type StaticGuideMeta = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  keywords: string[];
  /** Product slugs whose gallery images appear in the article (must be active in catalog). */
  imageProductSlugs: string[];
};

/** Editorial / promo blogs that are not 1:1 product guides. */
export const STATIC_BLOG_GUIDES: StaticGuideMeta[] = [
  {
    slug: "welcome10-voucher-code-rs-100-discount",
    title: "WELCOME10 Voucher Code — Rs 100 Welcome Bonus for New Users",
    metaTitle: "WELCOME10 Voucher Code | Rs 100 Discount Pakistan",
    metaDescription:
      "Use voucher code WELCOME10 at SimpleCart Store checkout for a Rs 100 welcome bonus when you are a new user. COD shopping tips for Pakistan.",
    publishedAt: "2026-08-22T10:00:00.000Z",
    keywords: [
      "WELCOME10 voucher code",
      "SimpleCart Store discount code",
      "Rs 100 welcome bonus Pakistan",
      "new user voucher COD",
      "promo code SimpleCart",
      "checkout discount Pakistan",
    ],
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "ribbed-glass-sipper-with-straw",
      "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma",
      "led-folding-makeup-mirror",
      "rechargeable-mosquito-killer-bat",
    ],
  },
  {
    slug: "inside-simplecart-store-real-stock-cod-pakistan",
    title: "How SimpleCart Store Works — Inventory, Packing & COD Delivery in Pakistan",
    metaTitle: "How SimpleCart Store Works | COD Home Essentials Pakistan",
    metaDescription:
      "Learn how SimpleCart Store sources home essentials, manages warehouse inventory, packs orders carefully, and ships with cash on delivery across Pakistan.",
    publishedAt: "2026-08-26T16:00:00.000Z",
    keywords: [
      "SimpleCart Store Pakistan",
      "buy home essentials online Pakistan",
      "COD delivery Pakistan online store",
      "kitchen appliances online Pakistan",
      "drinkware online shopping Pakistan",
      "how SimpleCart Store works",
      "ecommerce warehouse Pakistan",
    ],
    imageProductSlugs: [],
  },
  {
    slug: "cash-on-delivery-cod-simplecart-pakistan",
    title: "Cash on Delivery (COD) at SimpleCart Store — How It Works in Pakistan",
    metaTitle: "Cash on Delivery COD Pakistan | SimpleCart Store",
    metaDescription:
      "Learn how cash on delivery works at SimpleCart Store: place your order, receive the parcel, then pay in PKR when it arrives across Pakistan.",
    publishedAt: "2026-08-26T18:00:00.000Z",
    keywords: [
      "cash on delivery Pakistan",
      "COD online shopping Pakistan",
      "SimpleCart Store COD",
      "pay on delivery home essentials",
      "COD checkout Pakistan",
    ],
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "ribbed-glass-sipper-with-straw",
      "led-folding-makeup-mirror",
      "rechargeable-mosquito-killer-bat",
    ],
  },
  {
    slug: "drinkware-buying-guide-pakistan",
    title: "Drinkware Buying Guide for Pakistan — Sippers, Tumblers & Everyday Bottles",
    metaTitle: "Drinkware Buying Guide Pakistan | Tumblers & Sippers",
    metaDescription:
      "Choose the right sipper, tumbler or bottle for daily use in Pakistan. Practical tips, then shop Drinkware & Tumblers at SimpleCart Store with COD.",
    publishedAt: "2026-08-26T18:10:00.000Z",
    keywords: [
      "drinkware buying guide Pakistan",
      "best tumbler Pakistan",
      "glass sipper with straw",
      "water bottle online Pakistan",
      "drinkware tumblers SimpleCart",
    ],
    imageProductSlugs: [
      "ribbed-glass-sipper-with-straw",
      "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma",
      "2l-stainless-steel-electric-kettle",
    ],
  },
  {
    slug: "kitchen-essentials-pakistani-homes",
    title: "Kitchen Essentials for Pakistani Homes — Tools Worth Buying Online",
    metaTitle: "Kitchen Essentials Pakistan | SimpleCart Store Guide",
    metaDescription:
      "Build a practical Pakistani kitchen with essentials you will actually use — kettles, choppers and everyday tools. Shop Kitchen Essentials with COD.",
    publishedAt: "2026-08-26T18:20:00.000Z",
    keywords: [
      "kitchen essentials Pakistan",
      "kitchen tools online Pakistan",
      "electric kettle Pakistan",
      "chopper grinder home kitchen",
      "SimpleCart kitchen essentials",
    ],
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "ribbed-glass-sipper-with-straw",
      "led-folding-makeup-mirror",
    ],
  },
  {
    slug: "winter-room-heaters-buying-guide-pakistan",
    title: "Winter Room Heaters Buying Guide for Pakistan — Stay Warm Safely",
    metaTitle: "Room Heaters Buying Guide Pakistan | Winter Comfort",
    metaDescription:
      "How to choose a room heater for Pakistani winters: room size, safety, power use and placement. Shop heaters in Home Appliances at SimpleCart Store.",
    publishedAt: "2026-08-26T18:30:00.000Z",
    keywords: [
      "room heater Pakistan",
      "winter heater buying guide",
      "electric heater online Pakistan",
      "fan heater Pakistan",
      "home appliances heaters SimpleCart",
    ],
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma",
    ],
  },
  {
    slug: "how-to-place-track-order-simplecart",
    title: "How to Place an Order at SimpleCart Store — Checkout, COD & What Happens Next",
    metaTitle: "How to Place an Order | SimpleCart Store Pakistan",
    metaDescription:
      "Step-by-step: browse, add to cart, apply WELCOME10 if eligible, checkout with COD, and know what happens after you place an order at SimpleCart Store.",
    publishedAt: "2026-08-26T18:40:00.000Z",
    keywords: [
      "how to order SimpleCart Store",
      "checkout COD Pakistan",
      "track order online shopping Pakistan",
      "how to buy SimpleCart",
      "place order cash on delivery",
    ],
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "ribbed-glass-sipper-with-straw",
      "led-folding-makeup-mirror",
      "rechargeable-mosquito-killer-bat",
    ],
  },
  {
    slug: "gift-ideas-under-budget-pakistan",
    title: "Gift Ideas Under Budget in Pakistan — Useful Home & Beauty Picks",
    metaTitle: "Budget Gift Ideas Pakistan | SimpleCart Store",
    metaDescription:
      "Practical gift ideas under a clear budget for family and friends in Pakistan — drinkware, kitchen helpers, beauty gadgets. Order online with COD.",
    publishedAt: "2026-08-26T18:50:00.000Z",
    keywords: [
      "gift ideas Pakistan",
      "budget gifts online Pakistan",
      "home gift ideas COD",
      "useful gifts drinkware kitchen",
      "SimpleCart gift ideas",
    ],
    imageProductSlugs: [
      "ribbed-glass-sipper-with-straw",
      "led-folding-makeup-mirror",
      "2l-stainless-steel-electric-kettle",
      "rechargeable-mosquito-killer-bat",
      "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma",
    ],
  },
  {
    slug: "returns-trust-why-buy-simplecart",
    title: "Why Buy from SimpleCart Store — Trust, Packing & Purchase Protection",
    metaTitle: "Why Buy SimpleCart Store | Trust & Purchase Protection",
    metaDescription:
      "Why shoppers choose SimpleCart Store: managed inventory, careful packing, COD across Pakistan, and purchase protection if something goes wrong.",
    publishedAt: "2026-08-26T19:00:00.000Z",
    keywords: [
      "why buy SimpleCart Store",
      "trusted online store Pakistan",
      "purchase protection COD",
      "returns help SimpleCart",
      "shop with confidence Pakistan",
    ],
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "ribbed-glass-sipper-with-straw",
      "led-folding-makeup-mirror",
    ],
  },
];

/** Optional listing hero overrides (story photos) when product images are unavailable. */
export const STATIC_GUIDE_LISTING_HERO: Record<string, string> = {
  "inside-simplecart-store-real-stock-cod-pakistan": "/story/simplecart-store-06.jpg",
  "cash-on-delivery-cod-simplecart-pakistan": "/story/simplecart-store-04.jpg",
  "winter-room-heaters-buying-guide-pakistan": "/story/simplecart-store-05.jpg",
  "returns-trust-why-buy-simplecart": "/story/simplecart-store-08.jpg",
  "drinkware-buying-guide-pakistan": "/story/simplecart-store-03.jpg",
  "kitchen-essentials-pakistani-homes": "/story/simplecart-store-01.jpg",
  "how-to-place-track-order-simplecart": "/story/simplecart-store-07.jpg",
  "gift-ideas-under-budget-pakistan": "/story/simplecart-store-02.jpg",
};

export function getStaticGuideMeta(slug: string): StaticGuideMeta | undefined {
  return STATIC_BLOG_GUIDES.find((g) => g.slug === slug);
}

export function pickGuideImages(products: Product[], storeName: string): BlogImage[] {
  const out: BlogImage[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const src = (p.image ?? "").trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push({
      src,
      alt: `${p.name} — available at ${storeName}`,
    });
  }
  return out;
}

function pickImages(products: Product[], storeName: string): BlogImage[] {
  return pickGuideImages(products, storeName);
}

export function buildWelcome10GuideArticle(
  storeName: string,
  imageProducts: Product[],
): BlogArticle {
  const meta = STATIC_BLOG_GUIDES[0]!;
  const images = pickImages(imageProducts, storeName);
  const hero =
    images[0] ??
    ({
      src: "/brand/logo.svg",
      alt: `${storeName} WELCOME10 voucher`,
    } satisfies BlogImage);

  const img = (i: number): BlogImage | null => images[i] ?? null;

  const sections: BlogSection[] = [];
  const pushP = (text: string) => sections.push({ type: "paragraph", text });
  const pushH = (text: string) => sections.push({ type: "heading", text });
  const pushL = (items: string[]) => sections.push({ type: "list", items });
  const pushImg = (image: BlogImage | null) => {
    if (image) sections.push({ type: "image", image });
  };

  pushP(
    `New to ${storeName}? Your first order can start with a welcome bonus. Apply voucher code WELCOME10 at checkout and get Rs 100 off — a simple discount designed for new users shopping home, kitchen and beauty essentials online in Pakistan.`,
  );
  pushP(
    `This guide explains what WELCOME10 is, who can use it, and the exact steps to apply it so you do not miss the Rs 100 saving before you place a cash-on-delivery (COD) order.`,
  );

  pushH("What is the WELCOME10 voucher code?");
  pushP(
    `WELCOME10 is ${storeName}'s new-user welcome voucher. When an eligible new customer applies the code at checkout, the system grants a Rs 100 discount on the order. It is meant as a welcome bonus — thank-you savings for joining and placing your first shop with us.`,
  );
  pushP(
    `Search phrases like “WELCOME10 voucher code”, “SimpleCart Store discount Pakistan”, and “Rs 100 welcome bonus” all point to this same offer. Bookmark this page, then open any product you like and head to checkout when you are ready.`,
  );

  pushImg(img(1));

  pushH("Who can use WELCOME10?");
  pushL([
    "New users signing up or checking out for the first time on SimpleCart Store",
    "Shoppers who want a clear Rs 100 welcome bonus before paying COD",
    "Anyone building a first cart of drinkware, kitchen tools, appliances or beauty essentials",
  ]);
  pushP(
    `If the code does not apply, the checkout screen will show a clear message (for example if the voucher was already used, needs sign-in, or the cart does not meet the voucher rules). Sign in when prompted — vouchers often require an account so the welcome bonus stays fair for real new customers.`,
  );

  pushImg(img(2));

  pushH("How to apply WELCOME10 for Rs 100 off");
  pushL([
    "Browse collections or search for products you need — add items to your cart.",
    "Go to checkout and enter your delivery details for Pakistan.",
    "In the voucher / discount field, type WELCOME10 exactly (all caps, no spaces).",
    "Tap Apply — you should see Rs 100 deducted when the code is accepted.",
    "Place the order. Pay with cash on delivery where COD is shown at checkout.",
  ]);
  sections.push({
    type: "cta",
    text: "Ready to claim your Rs 100 welcome bonus? Start shopping and apply WELCOME10 at checkout.",
    href: "/collections",
    label: "Shop collections",
  });

  pushImg(img(3));

  pushH("Tips so WELCOME10 works first time");
  pushL([
    "Type the code carefully: WELCOME10 — avoid extra spaces or lowercase mistakes.",
    "Sign in if checkout asks you to — new-user vouchers are usually tied to your account.",
    "Confirm the discount line shows Rs 100 before you place the order.",
    "Keep browsing if you want to add another item; re-check the voucher total before paying.",
  ]);

  pushH("Why a welcome voucher helps Pakistani shoppers");
  pushP(
    `Online shopping in Pakistan works best when pricing is transparent in PKR and COD is available. A Rs 100 welcome bonus lowers the barrier on a first order so you can try ${storeName} with less hesitation — then reorder favourites once you know the quality and delivery experience.`,
  );
  pushP(
    `Pair WELCOME10 with products you already planned to buy. The photos in this article are real items from our live catalogue so you can jump from this guide straight into shopping.`,
  );

  pushImg(img(4));

  pushH("Frequently asked questions");
  pushP(
    `How much discount is WELCOME10? It gives a Rs 100 welcome bonus / discount when successfully applied at checkout for eligible new users.`,
  );
  pushP(
    `Do I need an account? Often yes — sign in when checkout asks, so the voucher can verify new-user eligibility.`,
  );
  pushP(
    `Can I use WELCOME10 with COD? Yes. Apply the voucher before placing the order; COD is available across Pakistan where shown at checkout.`,
  );
  pushP(
    `What if the code fails? Read the on-screen message, confirm spelling (WELCOME10), sign in, and ensure your cart meets any minimum rules. Contact support if it still fails.`,
  );

  pushH("Final takeaway");
  pushP(
    `For new customers, WELCOME10 is the fastest way to unlock a Rs 100 welcome discount at ${storeName}. Add products to cart, apply the code at checkout, confirm the saving, then complete your COD order with confidence.`,
  );
  sections.push({
    type: "cta",
    text: "Explore bestsellers and apply WELCOME10 before you pay.",
    href: "/",
    label: "Go to homepage",
  });

  const articleBodyText = sections
    .map((s) => {
      if (s.type === "paragraph" || s.type === "heading") return s.text;
      if (s.type === "list") return s.items.join(" ");
      if (s.type === "cta") return `${s.text} ${s.label}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

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
    articleBodyText,
  };
}

const STORE_STORY_SLUG = "inside-simplecart-store-real-stock-cod-pakistan";

const STORE_STORY_IMAGES = {
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
  kettleWholesale: {
    src: "/story/simplecart-store-09.jpg",
    alt: "Electric kettle stock beside wholesale cartons at SimpleCart Store",
  },
} as const satisfies Record<string, BlogImage>;

/** Editorial guide: operations, inventory & COD — professional SEO copy. */
export function buildStoreStoryGuideArticle(storeName: string): BlogArticle {
  const meta =
    STATIC_BLOG_GUIDES.find((g) => g.slug === STORE_STORY_SLUG) ?? STATIC_BLOG_GUIDES[1]!;
  const hero = STORE_STORY_IMAGES.warehouseBusy;

  const sections: BlogSection[] = [];
  const pushP = (text: string) => sections.push({ type: "paragraph", text });
  const pushH = (text: string) => sections.push({ type: "heading", text });
  const pushL = (items: string[]) => sections.push({ type: "list", items });
  const pushImg = (image: BlogImage) => sections.push({ type: "image", image });

  pushP(
    `Buying home essentials online should feel clear from the first click to delivery. This guide explains how ${storeName} operates — from warehouse inventory and product checks to careful packing and cash-on-delivery shipping across Pakistan.`,
  );
  pushP(
    `The photographs below were taken in our own stocking and dispatch area. They show the kettles, heaters, drinkware and cartons we manage so listed items can move from shelf to courier without unnecessary delay.`,
  );

  pushH("Our purpose and mission");
  pushP(
    `${storeName} is built for practical everyday shopping. We focus on home, kitchen, drinkware, beauty and small-appliance essentials at transparent PKR prices, with product pages that are easy to compare and checkout that supports cash on delivery nationwide.`,
  );
  pushP(
    `Our mission is selective curation: useful products people actually need, quality review before dispatch, secure packing, and honest communication on shipping timelines — whether you are ordering a kettle for the kitchen or a heater for cooler months.`,
  );

  pushImg(STORE_STORY_IMAGES.heaterDrinkware);

  pushH("Warehouse inventory behind the catalogue");
  pushP(
    `Behind the website is an active inventory space. Shipments arrive in bulk, items are opened and reviewed, and retail-ready units sit with packing materials until an order is confirmed. An “in stock” status is tied to what we hold and can prepare for dispatch.`,
  );
  pushP(
    `That operational model supports clearer delivery windows, free-shipping thresholds where applicable, and reliable COD fulfilment — because we ship from managed inventory, not from unverified promises.`,
  );

  pushImg(STORE_STORY_IMAGES.cartonStacks);
  pushImg(STORE_STORY_IMAGES.inventoryAisle);

  pushH("How orders move from shelf to doorstep");
  pushL([
    "Source and receive home essentials into our warehouse inventory.",
    "Inspect products such as kettles, heaters and tumblers before they are offered online.",
    "Publish clear photos, PKR pricing and availability on SimpleCart Store.",
    "When you order, pick the item, pack with protection (bubble wrap or carton as needed), and hand over to courier.",
    "Offer cash on delivery at checkout across Pakistan — pay when the parcel arrives where COD is available.",
  ]);

  pushImg(STORE_STORY_IMAGES.kettleQc);
  pushImg(STORE_STORY_IMAGES.tumblerPack);

  pushH("What you will find in our range");
  pushP(
    `Our catalogue mirrors what you see in stock: drinkware and tumblers, kitchen tools, small appliances such as electric kettles and heaters, beauty gadgets, lighting and everyday wellness. Breadth matters less than usefulness for Pakistani homes.`,
  );
  pushP(
    `From a glass tumbler prepared for shipping to a portable fan heater still in protective wrap, each category is chosen for daily use — then packed for safe transit.`,
  );

  pushImg(STORE_STORY_IMAGES.fanHeater);
  pushImg(STORE_STORY_IMAGES.kettleWholesale);
  pushImg(STORE_STORY_IMAGES.lifestyleJar);

  pushH("Why process transparency matters for COD shoppers");
  pushP(
    `Cash on delivery works when buyers understand how a store fulfils orders. Showing warehouse aisles, product checks and packing steps helps you judge service quality before you place an order.`,
  );
  pushP(
    `For shoppers searching for home essentials online in Pakistan, ${storeName} aims to answer with clear operations: managed inventory, careful packing, and nationwide COD where shown at checkout.`,
  );

  pushH("Next steps");
  pushP(
    `For a shorter overview of who we are, visit About Us. To start shopping, browse collections — new customers can also apply WELCOME10 at checkout when eligible.`,
  );
  sections.push({
    type: "cta",
    text: "Read our company overview and contact options.",
    href: "/about",
    label: "About SimpleCart Store",
  });
  sections.push({
    type: "cta",
    text: "Explore drinkware, kitchen tools and home appliances ready to order.",
    href: "/collections",
    label: "Shop collections",
  });

  const articleBodyText = sections
    .map((s) => {
      if (s.type === "paragraph" || s.type === "heading") return s.text;
      if (s.type === "list") return s.items.join(" ");
      if (s.type === "cta") return `${s.text} ${s.label}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

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
    articleBodyText,
  };
}

export function staticGuideListingCard(
  meta: StaticGuideMeta,
  storeName: string,
  heroImage?: string | null,
) {
  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.metaDescription,
    image: {
      src: heroImage?.trim() || "/brand/logo.svg",
      alt: `${meta.title} — ${storeName}`,
    },
    href: `/blogs/${meta.slug}`,
    productHref: "/collections" as string | null,
    isGuide: true as const,
  };
}
