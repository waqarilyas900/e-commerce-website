import type { Product } from "@/app/lib/catalog/types";
import type { BlogImage } from "@/app/lib/blog/product-blog";

export type StaticGuideMeta = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  readTimeMinutes: number;
  categoryLabel: string;
  keywords: string[];
  collectionSlug?: string;
  imageProductSlugs: string[];
};

export const STATIC_BLOG_GUIDES: StaticGuideMeta[] = [
  {
    slug: "drinkware-buying-guide-pakistan",
    title: "Drinkware & Tumbler Buying Guide for Pakistan — Best Sippers, Flasks & Insulated Bottles (2026)",
    metaTitle: "Best Tumblers & Drinkware Buying Guide Pakistan | SimpleCart",
    metaDescription:
      "Looking for the best tumbler, glass sipper, or insulated water bottle in Pakistan? Compare 304 stainless steel vs borosilicate glass, thermal retention, and COD prices.",
    publishedAt: "2026-08-28T16:00:00.000Z",
    readTimeMinutes: 7,
    categoryLabel: "Drinkware & Hydration",
    keywords: [
      "drinkware buying guide Pakistan",
      "best tumbler Pakistan",
      "glass sipper with straw price Pakistan",
      "insulated water bottle Pakistan",
      "hot and cold thermos flask Pakistan",
      "car heating cup 12v 24v",
      "buy tumblers online cash on delivery",
    ],
    collectionSlug: "drinkware-tumblers",
    imageProductSlugs: [
      "ribbed-glass-sipper-with-straw",
      "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma",
      "2l-stainless-steel-electric-kettle",
    ],
  },
  {
    slug: "kitchen-essentials-pakistani-homes",
    title: "10 Essential Kitchen Tools & Electric Appliances for Pakistani Homes (2026 Guide)",
    metaTitle: "10 Essential Kitchen Tools & Appliances Pakistan | SimpleCart",
    metaDescription:
      "Must-have kitchen gadgets for Pakistani cooking: multi-blade choppers, spice grinders, electric kettles, and prep tools. Buy online with Cash on Delivery nationwide.",
    publishedAt: "2026-08-28T15:30:00.000Z",
    readTimeMinutes: 8,
    categoryLabel: "Kitchen & Dining",
    keywords: [
      "kitchen essentials Pakistan",
      "electric chopper price in Pakistan",
      "spice grinder machine online Pakistan",
      "stainless steel electric kettle 2l",
      "best kitchen gadgets for cooking Pakistan",
      "kitchen tools online COD",
    ],
    collectionSlug: "kitchen-essentials",
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "ribbed-glass-sipper-with-straw",
    ],
  },
  {
    slug: "home-appliances-buying-guide-pakistan",
    title: "Small Home Appliances Buying Guide in Pakistan — Energy Efficiency & Longevity",
    metaTitle: "Home Appliances Buying Guide Pakistan | SimpleCart Store",
    metaDescription:
      "How to choose durable, energy-saving small home appliances in Pakistan: electric kettles, mini stoves, heaters, and humidifiers. Low wattage and voltage protection tips.",
    publishedAt: "2026-08-28T15:00:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Home Appliances",
    keywords: [
      "small home appliances Pakistan",
      "electric kettle low wattage",
      "energy efficient appliances Pakistan",
      "portable electric stove Pakistan",
      "home electronics cash on delivery",
    ],
    collectionSlug: "home-appliances",
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma",
    ],
  },
  {
    slug: "beauty-personal-care-gadgets-guide-pakistan",
    title: "Top Beauty & Grooming Gadgets in Pakistan — LED Mirrors, Trimmers & Vanity Tools",
    metaTitle: "Beauty & Grooming Gadgets Guide Pakistan | SimpleCart Store",
    metaDescription:
      "Upgrade your daily vanity and grooming routine with LED touch makeup mirrors, rechargeable trimmers, and skin care tools. Tested for Pakistani users with COD delivery.",
    publishedAt: "2026-08-28T14:30:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Beauty & Personal Care",
    keywords: [
      "beauty gadgets Pakistan",
      "LED makeup mirror with light price Pakistan",
      "folding cosmetic mirror touch screen",
      "grooming gadgets online Pakistan",
      "skincare vanity accessories COD",
    ],
    collectionSlug: "beauty-personal-care",
    imageProductSlugs: [
      "led-folding-makeup-mirror",
    ],
  },
  {
    slug: "pest-control-mosquito-killer-bats-guide-pakistan",
    title: "Mosquito Killer Bats & Pest Control in Pakistan — Dengue & Malaria Prevention Guide",
    metaTitle: "Mosquito Killer Bats & Dengue Prevention Pakistan | SimpleCart",
    metaDescription:
      "Protect your family against dengue and seasonal mosquitoes with rechargeable electric bats and insect zappers. Battery longevity, safety mesh, and charging tips.",
    publishedAt: "2026-08-28T14:00:00.000Z",
    readTimeMinutes: 5,
    categoryLabel: "Pest Control & Health",
    keywords: [
      "mosquito killer bat price in Pakistan",
      "rechargeable mosquito racket Pakistan",
      "dengue prevention tools home Pakistan",
      "electric insect killer bat COD",
      "mosquito swatter rechargeable battery",
    ],
    collectionSlug: "pest-control",
    imageProductSlugs: [
      "rechargeable-mosquito-killer-bat",
    ],
  },
  {
    slug: "lamps-lighting-home-decor-guide-pakistan",
    title: "Lamps & Ambient Lighting Guide — Aesthetic Study Lamps, Night Lights & Room Decor",
    metaTitle: "Lamps & Ambient Lighting Guide Pakistan | SimpleCart Store",
    metaDescription:
      "Transform your bedroom, desk, or living area with rechargeable LED desk lamps, soothing ambient night lights, and decorative lamps. Shop online with COD in Pakistan.",
    publishedAt: "2026-08-28T13:30:00.000Z",
    readTimeMinutes: 5,
    categoryLabel: "Lamps & Lighting",
    keywords: [
      "lamps and lighting Pakistan",
      "rechargeable study lamp price Pakistan",
      "aesthetic bedroom night light",
      "LED desk lamp touch sensor",
      "decorative room lights online Pakistan",
    ],
    collectionSlug: "lamps-lighting",
    imageProductSlugs: [],
  },
  {
    slug: "wellness-comfort-massagers-lifestyle-pakistan",
    title: "Daily Wellness & Posture Comfort — Top Massagers & Ergonomic Living Gadgets",
    metaTitle: "Wellness & Posture Comfort Products Pakistan | SimpleCart",
    metaDescription:
      "Relieve neck stiffness, back pain, and muscle fatigue after long work hours. Explore portable electronic massagers and ergonomic relaxation tools with COD delivery.",
    publishedAt: "2026-08-28T13:00:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Wellness & Comfort",
    keywords: [
      "wellness products Pakistan",
      "body massager price in Pakistan",
      "neck back pain relief cushion",
      "ergonomic lifestyle gadgets COD",
      "relaxation tools online Pakistan",
    ],
    collectionSlug: "wellness-comfort",
    imageProductSlugs: [],
  },
  {
    slug: "fabric-guide-terry-cotton-lycra-pakistan",
    title: "Fabric & Material Guide: Terry Cotton vs Lycra Stretch vs Fleece for Pakistani Climate",
    metaTitle: "Fabric Guide: Terry vs Lycra vs Fleece Pakistan | SimpleCart",
    metaDescription:
      "Learn how to choose the right fabric for Pakistani summers and winters. Comprehensive comparison of French Terry, 4-Way Lycra Stretch, and Micro-Fleece.",
    publishedAt: "2026-08-28T12:00:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Fabric & Materials",
    keywords: [
      "fabric guide Pakistan",
      "terry cotton fabric Pakistan",
      "lycra 4 way stretch trousers",
      "fleece vs terry fabric",
      "breathable summer fabrics Pakistan",
      "activewear fabric guide",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [],
  },
  {
    slug: "oversized-t-shirts-styling-size-guide-pakistan",
    title: "The Ultimate Oversized T-Shirt Size & Styling Guide for Pakistan",
    metaTitle: "Oversized T-Shirts Size & Styling Guide Pakistan | SimpleCart",
    metaDescription:
      "How to style oversized drop-shoulder tees and choose the right size according to Pakistani body types. Fit tips, styling ideas, and COD shopping.",
    publishedAt: "2026-08-28T11:00:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Apparel & Streetwear",
    keywords: [
      "oversized t-shirt size guide Pakistan",
      "how to style oversized t-shirts",
      "drop shoulder tee fit guide",
      "men street style Pakistan",
      "oversize shirts online Pakistan",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [],
  },
  {
    slug: "wash-and-care-guide-garments-pakistan",
    title: "How to Wash & Care for Garments in Pakistan — Prevent Shrinkage & Color Fading",
    metaTitle: "Wash & Care Guide for Clothes in Pakistan | SimpleCart",
    metaDescription:
      "Expert laundry tips for Pakistani water conditions: protect acid-wash colors, preserve elasticity in stretch fabrics, and prevent shrinkage.",
    publishedAt: "2026-08-28T10:00:00.000Z",
    readTimeMinutes: 5,
    categoryLabel: "Garment Care",
    keywords: [
      "how to wash clothes Pakistan",
      "prevent color fading garments",
      "wash care tips acid wash",
      "cotton terry care instructions",
      "laundry tips Pakistan",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [],
  },
  {
    slug: "winter-room-heaters-buying-guide-pakistan",
    title: "Winter Room Heaters Buying Guide for Pakistan — Stay Warm Safely & Save Energy",
    metaTitle: "Room Heaters Buying Guide Pakistan | Winter Comfort",
    metaDescription:
      "How to choose the right room heater for Pakistani winters: room size, safety, power use, and placement. Shop heaters with COD at SimpleCart Store.",
    publishedAt: "2026-08-26T18:30:00.000Z",
    readTimeMinutes: 7,
    categoryLabel: "Seasonal Winter Care",
    keywords: [
      "room heater Pakistan",
      "winter heater buying guide",
      "electric heater online Pakistan",
      "fan heater Pakistan",
      "home appliances heaters SimpleCart",
    ],
    collectionSlug: "home-appliances",
    imageProductSlugs: [
      "2l-stainless-steel-electric-kettle",
      "450ml-car-heating-cup-12v-24v-portable-electric-kettle-smart-touch-screen-therma",
    ],
  },
  {
    slug: "gift-ideas-under-budget-pakistan",
    title: "25 Practical & Trendy Gift Ideas Under Rs 1,500, Rs 3,000 & Rs 5,000 in Pakistan",
    metaTitle: "Budget Gift Ideas Under Rs 3000 Pakistan | SimpleCart Store",
    metaDescription:
      "Thoughtful, high-utility gift ideas under Rs 1,500, Rs 3,000, and Rs 5,000 for birthdays, anniversaries, family, and colleagues in Pakistan with nationwide COD.",
    publishedAt: "2026-08-26T18:50:00.000Z",
    readTimeMinutes: 7,
    categoryLabel: "Gifting & Ideas",
    keywords: [
      "gift ideas Pakistan",
      "budget gifts under 3000 Pakistan",
      "gifts under 1500 PKR online",
      "useful lifestyle gifts COD Pakistan",
      "birthday gift ideas online shopping",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [
      "ribbed-glass-sipper-with-straw",
      "led-folding-makeup-mirror",
    ],
  },
  {
    slug: "cash-on-delivery-cod-simplecart-pakistan",
    title: "Cash on Delivery (COD) Online Shopping in Pakistan — The Ultimate Safe Buyer's Guide",
    metaTitle: "Cash on Delivery (COD) Shopping Guide Pakistan | SimpleCart Store",
    metaDescription:
      "Everything you need to know about Cash on Delivery (COD) in Pakistan: order confirmation, delivery timelines, courier tracking, and return protection.",
    publishedAt: "2026-08-26T18:00:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Shopping & Delivery",
    keywords: [
      "cash on delivery Pakistan",
      "COD online shopping Pakistan",
      "how COD works Pakistan",
      "safe online shopping Pakistan",
      "courier delivery COD Pakistan",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [],
  },
  {
    slug: "online-shopping-scams-safe-buying-guide-pakistan",
    title: "How to Avoid Online Shopping Scams in Pakistan — 7 Golden Rules for COD Shoppers",
    metaTitle: "How to Avoid Online Shopping Scams in Pakistan | SimpleCart",
    metaDescription:
      "Protect your hard-earned money from fake online pages and fraud parcels. Learn 7 golden rules for safe cash-on-delivery shopping in Pakistan.",
    publishedAt: "2026-08-28T09:00:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Consumer Protection",
    keywords: [
      "avoid online shopping scams Pakistan",
      "fake parcel fraud prevention COD",
      "safe online shopping tips Pakistan",
      "verified online store check Pakistan",
      "purchase protection policy",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [],
  },
  {
    slug: "welcome10-voucher-code-rs-100-discount",
    title: "SimpleCart Voucher Codes & Discounts: How to Save More on Every Order",
    metaTitle: "WELCOME10 Voucher Code | Rs 100 Discount Pakistan",
    metaDescription:
      "Use voucher code WELCOME10 at SimpleCart Store checkout for a Rs 100 welcome bonus when you shop online in Pakistan with Cash on Delivery.",
    publishedAt: "2026-08-22T10:00:00.000Z",
    readTimeMinutes: 4,
    categoryLabel: "Deals & Discounts",
    keywords: [
      "WELCOME10 voucher code",
      "SimpleCart Store discount code",
      "Rs 100 welcome bonus Pakistan",
      "new user voucher COD",
      "checkout discount Pakistan",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [],
  },
  {
    slug: "inside-simplecart-store-real-stock-cod-pakistan",
    title: "Inside SimpleCart Store — Real Warehouse Inventory, Quality Check & Fast Courier Dispatch",
    metaTitle: "How SimpleCart Store Works | Real Stock & COD Pakistan",
    metaDescription:
      "See how SimpleCart Store operates: real in-hand inventory, rigorous quality checks, protective parcel packing, and fast COD delivery across Pakistan.",
    publishedAt: "2026-08-26T16:00:00.000Z",
    readTimeMinutes: 6,
    categoryLabel: "Behind the Scenes",
    keywords: [
      "SimpleCart Store Pakistan",
      "trusted online shopping Pakistan",
      "COD delivery Pakistan online store",
      "how SimpleCart Store works",
      "ecommerce warehouse Pakistan",
    ],
    collectionSlug: "home-essentials",
    imageProductSlugs: [],
  },
];

export const STATIC_GUIDE_LISTING_HERO: Record<string, string> = {
  "drinkware-buying-guide-pakistan": "/story/simplecart-store-03.jpg",
  "kitchen-essentials-pakistani-homes": "/story/simplecart-store-01.jpg",
  "home-appliances-buying-guide-pakistan": "/story/simplecart-store-05.jpg",
  "beauty-personal-care-gadgets-guide-pakistan": "/story/simplecart-store-02.jpg",
  "pest-control-mosquito-killer-bats-guide-pakistan": "/story/simplecart-store-08.jpg",
  "lamps-lighting-home-decor-guide-pakistan": "/story/simplecart-store-03.jpg",
  "wellness-comfort-massagers-lifestyle-pakistan": "/story/simplecart-store-02.jpg",
  "fabric-guide-terry-cotton-lycra-pakistan": "/story/simplecart-store-06.jpg",
  "oversized-t-shirts-styling-size-guide-pakistan": "/story/simplecart-store-07.jpg",
  "wash-and-care-guide-garments-pakistan": "/story/simplecart-store-08.jpg",
  "winter-room-heaters-buying-guide-pakistan": "/story/simplecart-store-05.jpg",
  "gift-ideas-under-budget-pakistan": "/story/simplecart-store-02.jpg",
  "cash-on-delivery-cod-simplecart-pakistan": "/story/simplecart-store-04.jpg",
  "online-shopping-scams-safe-buying-guide-pakistan": "/story/simplecart-store-04.jpg",
  "welcome10-voucher-code-rs-100-discount": "/story/simplecart-store-04.jpg",
  "inside-simplecart-store-real-stock-cod-pakistan": "/story/simplecart-store-06.jpg",
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

export function staticGuideListingCard(
  meta: StaticGuideMeta,
  storeName: string,
  heroImageOverride?: string | null,
) {
  const heroSrc =
    heroImageOverride ||
    STATIC_GUIDE_LISTING_HERO[meta.slug] ||
    "/story/simplecart-store-01.jpg";
  return {
    slug: meta.slug,
    title: meta.title,
    excerpt: meta.metaDescription,
    publishedAt: meta.publishedAt,
    readTimeMinutes: meta.readTimeMinutes,
    categoryLabel: meta.categoryLabel,
    image: {
      src: heroSrc,
      alt: `${meta.title} — ${storeName} guide`,
    },
    href: `/blogs/${meta.slug}`,
    isGuide: true as const,
  };
}
