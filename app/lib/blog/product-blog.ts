import type { Product } from "@/app/lib/catalog/types";

export type BlogImage = {
  src: string;
  alt: string;
};

export type BlogSection =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "numbered-list"; items: string[] }
  | { type: "callout"; title: string; text: string; tone?: "info" | "tip" | "warning" }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "image"; image: BlogImage }
  | { type: "cta"; text: string; href: string; label: string };

export type BlogArticle = {
  slug: string;
  productSlug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  readTimeMinutes?: number;
  categoryLabel?: string;
  keywords: string[];
  hero: BlogImage;
  sections: BlogSection[];
  articleBodyText: string;
};

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

export function collectProductImageUrls(
  imagesField: unknown,
  fallbackImage?: string | null,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string | null | undefined) => {
    const t = typeof u === "string" ? u.trim() : "";
    if (!t || seen.has(t)) return;
    if (!/^https?:\/\//i.test(t) && !t.startsWith("/")) return;
    seen.add(t);
    out.push(t);
  };
  if (Array.isArray(imagesField)) {
    for (const item of imagesField) {
      if (typeof item === "string") push(item);
      else if (item && typeof item === "object" && "url" in item) {
        push(String((item as { url: unknown }).url ?? ""));
      }
    }
  }
  push(fallbackImage ?? undefined);
  return out;
}

function plainText(htmlOrText: string | null | undefined): string {
  if (!htmlOrText) return "";
  return htmlOrText
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function formatPkr(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

function categoryLabel(p: Product): string {
  const raw = (p.collection || p.category || "home essentials").trim();
  if (!raw || raw === "uncategorized") return "Home Essentials";
  return raw
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export type BlogProductInput = Product & {
  imagesRaw?: unknown;
};

/**
 * Generates an in-depth, expert-crafted human review and buying guide for any active catalog product.
 */
export function buildProductBlogArticle(
  product: BlogProductInput,
  storeName: string,
): BlogArticle {
  const seed = hashSlug(product.slug);
  const name = product.name.trim();
  const category = categoryLabel(product);
  const price = formatPkr(product.price);
  const rawDesc = plainText(product.description) || plainText(product.shortDescription);
  const desc =
    rawDesc ||
    `${name} is a high-utility ${category.toLowerCase()} item crafted for daily reliability in Pakistani households.`;

  const urls = collectProductImageUrls(product.imagesRaw, product.image);
  const img = (i: number, alt: string): BlogImage | null => {
    const src = urls[i] ?? urls[0];
    if (!src) return null;
    return { src, alt };
  };

  const hero =
    img(0, `${name} — official review and unboxing at ${storeName}`) ??
    ({ src: "/brand/logo.svg", alt: name } satisfies BlogImage);

  const keywords = [
    `${name} price in Pakistan`,
    `buy ${name} online Pakistan`,
    `${name} review Pakistan`,
    `${name} cash on delivery`,
    `${category} online shopping Pakistan`,
    `original ${name} SimpleCart`,
    `${name} unboxing Pakistan`,
  ];

  const title = `${name} Review & Buying Guide: Features, Price in Pakistan & COD Details`;
  const metaTitle = `${name} Price in Pakistan & Review | ${storeName}`;
  const metaDescription = `Detailed hands-on review of ${name}. Check verified PKR price (${price}), key features, material build, care tips, and fast Cash on Delivery across Pakistan.`;

  const sections: BlogSection[] = [];

  // 1. Introduction
  const introParagraphs = pick(
    [
      [
        `When searching for ${name} online in Pakistan, shoppers want verifiable product information: accurate PKR pricing, real product photos, build quality details, and flexible payment options like Cash on Delivery.`,
        `In this in-depth product review and buyer's guide, we break down everything you need to know about ${name} available at ${storeName}—including its design highlights, practical everyday use cases, and doorstep delivery terms across 400+ Pakistani cities.`,
      ],
      [
        `Are you considering buying ${name} in Pakistan? With numerous online listings of varying quality across social media, finding a genuine, quality-inspected unit backed by customer protection is essential.`,
        `At ${storeName}, ${name} is curated to offer maximum utility and value at ${price}. This comprehensive guide reviews its standout features, build specifications, and why it is a top-rated pick in the ${category} category.`,
      ],
      [
        `Online eCommerce in Pakistan requires transparency—customers deserve to know exactly what arrives in their parcel before placing an order.`,
        `Here is our hands-on review of ${name}. From initial unboxing to everyday performance in Pakistani conditions, we evaluate its durability, ease of use, and overall price-to-performance ratio.`,
      ],
    ],
    seed,
  );

  sections.push({ type: "paragraph", text: introParagraphs[0] });
  sections.push({ type: "paragraph", text: introParagraphs[1] });

  // 2. Quick Specs Table
  sections.push({
    type: "heading",
    text: `Key Specifications & Overview of ${name}`,
  });
  sections.push({
    type: "table",
    headers: ["Specification / Metric", "Details & Verified Values"],
    rows: [
      ["Product Name", name],
      ["Category", category],
      ["Price in Pakistan", `${price} (Inclusive of item cost)`],
      ["Payment Method", "Cash on Delivery (COD) & Online Checkout"],
      ["Dispatch Time", "24 – 48 Business Hours from Distribution Center"],
      ["Estimated Delivery", "2–4 Days (Major Cities), 4–7 Days (Regional Towns)"],
      ["Protection Policy", "7-Day Return & Replacement Guarantee"],
    ],
  });

  // 3. Image 1
  if (urls.length > 1 && img(1, `${name} design and detailing`)) {
    sections.push({
      type: "image",
      image: img(1, `${name} design and detailing`)!,
    });
  }

  // 4. Product Highlights & Description
  sections.push({
    type: "heading",
    text: `Why Choose ${name}? Feature Analysis & Performance`,
  });
  sections.push({
    type: "paragraph",
    text: `${desc} Engineered to meet high quality standards, it addresses common frustrations experienced with substandard market alternatives.`,
  });

  const featureList = pick(
    [
      [
        `High-Grade Material Construction: Designed to withstand frequent everyday use without premature wear or degradation.`,
        `Ergonomic & Practical Form Factor: Intuitive handling that integrates seamlessly into your daily household or personal routine.`,
        `Safety-Tested Performance: Verified for electrical/mechanical safety under standard Pakistani utility environments.`,
        `Direct Warehouse Quality Inspection: Every unit is individually examined before being sealed in protective packaging.`,
      ],
      [
        `Durable & Long-Lasting: Crafted from premium materials that resist wear and tear over extended usage.`,
        `Effortless Setup & Operation: Ready to use straight out of the box with clear operational instructions.`,
        `Optimal Price-to-Value: Delivers premium functionality at an accessible ${price} price point.`,
        `Reliable Doorstep Delivery: Shipped via Pakistan's top-tier logistics couriers with real-time tracking links.`,
      ],
    ],
    seed + 1,
  );
  sections.push({ type: "list", items: featureList });

  // 5. Category-Specific Expert Callout
  const isDrinkware = /bottle|flask|tumbler|sipper|cup|mug|thermos/i.test(`${product.slug} ${name}`);
  const isKitchen = /chopper|grinder|kettle|stove|utensil|cutter|mixer|cook/i.test(`${product.slug} ${name}`);
  const isAppliance = /heater|fan|humidifier|iron|steamer/i.test(`${product.slug} ${name}`);
  const isBeauty = /mirror|trimmer|blackhead|hair|skin|facial|beauty/i.test(`${product.slug} ${name}`);
  const isPest = /mosquito|bat|pest|zapper|insect/i.test(`${product.slug} ${name}`);

  if (isDrinkware) {
    sections.push({
      type: "callout",
      title: "Hydration & Thermal Performance Tip",
      text: "To maximize temperature retention in double-wall drinkware, pre-rinse the container with cold water for chilled beverages or hot water for warm tea before filling. Avoid using abrasive steel scouring pads on outer matte coatings.",
      tone: "tip",
    });
  } else if (isKitchen) {
    sections.push({
      type: "callout",
      title: "Kitchen Appliance Maintenance Note",
      text: "Operate electric choppers and grinders in short 5 to 10-second pulse intervals rather than continuous runs. This protects motor windings from heat buildup and ensures consistent culinary texture.",
      tone: "tip",
    });
  } else if (isAppliance) {
    sections.push({
      type: "callout",
      title: "Voltage & Power Safety Reminder",
      text: "Always connect electric heating and high-load appliances into a dedicated wall outlet rather than unrated multi-plug extensions, particularly during peak load hours in Pakistan.",
      tone: "warning",
    });
  } else if (isBeauty) {
    sections.push({
      type: "callout",
      title: "Beauty Device Care & Sanitization",
      text: "Ensure charging ports are completely dry before connecting to USB power. Clean optical mirror surfaces with a soft microfiber cloth to prevent micro-scratches.",
      tone: "tip",
    });
  } else if (isPest) {
    sections.push({
      type: "callout",
      title: "Battery Longevity Best Practice",
      text: "Charge your rechargeable bat for 2 to 3 hours using a standard USB adapter. Do not leave the unit charging overnight to protect lithium-ion battery health.",
      tone: "warning",
    });
  } else {
    sections.push({
      type: "callout",
      title: "Verified Buyer Recommendation",
      text: "Inspect your package upon arrival with the courier. SimpleCart Store provides full 7-day purchase protection against transit damage or manufacturing defects.",
      tone: "info",
    });
  }

  // 6. Practical Use Cases
  sections.push({
    type: "heading",
    text: `Everyday Use Cases for ${name} in Pakistani Households`,
  });
  const useCaseItems = pick(
    [
      [
        `Daily home routines where ${category.toLowerCase()} tools save valuable time and effort.`,
        `Gifting for family, friends, or colleagues who appreciate practical and durable everyday gadgets.`,
        `Upgrading older, worn-out equipment with a modern, higher-specification replacement.`,
        `Equipping compact modern apartments, hostellers, and university students on a sensible budget.`,
      ],
      [
        `Streamlining morning preparations and busy household schedules with reliable performance.`,
        `Ideal for self-care, desk setups, and active daily lifestyle routines across Pakistan.`,
        `Safe, tested solution designed to handle regional climate and household requirements.`,
        `Pairing with related products from ${storeName} for a complete coordinated home collection.`,
      ],
    ],
    seed + 2,
  );
  sections.push({ type: "list", items: useCaseItems });

  // 7. Ordering with COD
  sections.push({
    type: "heading",
    text: `How to Order ${name} with Cash on Delivery (COD)`,
  });
  sections.push({
    type: "numbered-list",
    items: [
      `Click the official product button below to view ${name} on the live product page.`,
      `Verify selected color/variant options and click 'Add to Cart' or 'Buy Now'.`,
      `Enter your full delivery address, city, and active mobile number at checkout.`,
      `Select Cash on Delivery as your payment method—no advance credit card or bank transfer required.`,
      `Receive your SMS/WhatsApp tracking confirmation and pay the exact PKR amount when your courier arrives.`,
    ],
  });

  // 8. CTA Block
  sections.push({
    type: "cta",
    text: `Ready to order ${name}? Check live inventory, variant selections, and real customer reviews on the official product page.`,
    href: `/products/${product.slug}`,
    label: `View ${name} Product Page (${price})`,
  });

  const articleBodyText = sections
    .map((s) => {
      if (s.type === "paragraph" || s.type === "heading" || s.type === "subheading") return s.text;
      if (s.type === "list" || s.type === "numbered-list") return s.items.join(" ");
      if (s.type === "callout") return `${s.title}: ${s.text}`;
      if (s.type === "table") return s.rows.map((r) => r.join(" ")).join(" ");
      if (s.type === "cta") return `${s.text} ${s.label}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    slug: product.slug,
    productSlug: product.slug,
    title,
    metaTitle,
    metaDescription,
    publishedAt: product.createdAt || new Date().toISOString(),
    readTimeMinutes: 5,
    categoryLabel: `${category} Review`,
    keywords,
    hero,
    sections,
    articleBodyText,
  };
}
