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

/** Collect usable image URLs from product row `images` JSON + card image. */
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
  if (!raw || raw === "uncategorized") return "home essentials";
  return raw.replace(/-/g, " ");
}

export type BlogProductInput = Product & {
  /** Raw `products.images` when available (detail page). */
  imagesRaw?: unknown;
};

/**
 * One SEO blog per active product — same section format, product-specific copy + images.
 * Blog slug === product slug so indexing maps cleanly to `/products/{slug}`.
 */
export function buildProductBlogArticle(
  product: BlogProductInput,
  storeName: string,
): BlogArticle {
  const seed = hashSlug(product.slug);
  const name = product.name.trim();
  const category = categoryLabel(product);
  const price = formatPkr(product.price);
  const desc = plainText(product.description) || plainText(product.shortDescription);
  const short =
    plainText(product.shortDescription) ||
    `${name} is a practical ${category} pick for everyday use in Pakistani homes.`;

  const urls = collectProductImageUrls(product.imagesRaw, product.image);
  const img = (i: number, alt: string): BlogImage | null => {
    const src = urls[i] ?? urls[0];
    if (!src) return null;
    return { src, alt };
  };

  const hero =
    img(0, `${name} — buy online in Pakistan at ${storeName}`) ??
    ({ src: "/brand/logo.svg", alt: name } satisfies BlogImage);

  const keywords = [
    `${name} price in Pakistan`,
    `buy ${name} online Pakistan`,
    `${name} COD`,
    `${category} online Pakistan`,
    `${storeName} ${name}`,
    "cash on delivery Pakistan",
    "home essentials Pakistan",
  ];

  const introOpen = pick(
    [
      `Looking for the best place to buy ${name} online in Pakistan? This guide covers real product details, PKR pricing, and how to order with cash on delivery from ${storeName}.`,
      `If you want ${name} with nationwide delivery across Pakistan, this SimpleCart blog walks through features, everyday use cases, and a simple COD checkout path.`,
      `${name} is a popular ${category} choice for Pakistani shoppers who want clear photos, fair PKR prices, and reliable delivery. Here is everything you should know before you order.`,
    ],
    seed,
  );

  const whyPakistan = pick(
    [
      `Online shopping in Pakistan works best when product photos match what arrives, pricing is shown in PKR, and cash on delivery is available. ${storeName} lists ${name} with those basics covered so you can decide with confidence.`,
      `From major cities to smaller towns, customers increasingly prefer COD for first-time purchases. Ordering ${name} from ${storeName} keeps payment flexible while you review photos and specs on the product page.`,
      `Search intent for “${name} price in Pakistan” usually means shoppers want a trustworthy listing, not a vague catalogue. This article points you to the live product page where stock and current price are always up to date.`,
    ],
    seed + 1,
  );

  const useCases = pick(
    [
      [
        `Daily home routines where ${category} tools save time`,
        `Gifting for family who appreciate practical ${category} items`,
        `Upgrading an older piece with a fresher, more useful ${name}`,
        `Building a matching set alongside related products at ${storeName}`,
      ],
      [
        `Small kitchens and apartments that need compact, useful gear`,
        `Students and young professionals shopping on a clear PKR budget`,
        `Parents looking for reliable everyday ${category} essentials`,
        `Anyone comparing online options before choosing COD delivery`,
      ],
      [
        `Refreshing your home setup without overcomplicating the purchase`,
        `Replacing worn items with a better-specified ${name}`,
        `Adding a useful ${category} piece that fits Pakistani households`,
        `Checking reviews and photos first, then ordering with confidence`,
      ],
    ],
    seed + 2,
  );

  const buyingSteps = [
    `Open the official ${name} product page on ${storeName} to confirm live price, stock, and gallery photos.`,
    "Choose quantity (and options if shown), then add the item to your cart.",
    "Checkout with your name, phone, and complete delivery address.",
    "Select cash on delivery where available and place the order — pay when the parcel arrives.",
  ];

  const careTips = pick(
    [
      [
        "Keep the product on a stable surface during first use and follow any included power or care notes.",
        "Wipe with a soft cloth; avoid harsh chemicals that can mark finishes.",
        "Store away from extreme heat or moisture when not in use.",
        "If something arrives damaged, contact support promptly with your order details.",
      ],
      [
        "Read the on-page specifications before first use so expectations match the listing.",
        "Clean gently after everyday use to keep the finish looking fresh.",
        "Unplug or securely close lids/caps when storing travel-friendly items.",
        "Save your order confirmation so support can help faster if needed.",
      ],
      [
        "Use the product as described on the listing for best results.",
        "Avoid overloading capacity marks when the design includes a fill line.",
        "Keep packaging until you confirm everything arrived correctly.",
        "Reach out via Contact if you need help choosing a related accessory.",
      ],
    ],
    seed + 3,
  );

  const faqs: string[] = [
    `Can I buy ${name} with cash on delivery in Pakistan? Yes — ${storeName} offers COD across Pakistan where shown at checkout. You pay when your order arrives.`,
    `How long does delivery take for ${name}? Orders are typically packed within 1–2 business days. Delivery usually takes 2–5 business days in major cities and 4–8 business days in other areas.`,
    `Is the price of ${name} shown in PKR? Yes. The live product page lists the current Pakistan Rupee price so you can compare before checkout.`,
    `What if ${name} is out of stock? You can open the product page to confirm availability, or browse related ${category} items while you wait for restock.`,
  ];

  const sections: BlogSection[] = [];
  const pushP = (text: string) => sections.push({ type: "paragraph", text });
  const pushH = (text: string) => sections.push({ type: "heading", text });
  const pushL = (items: string[]) => sections.push({ type: "list", items });
  const pushImg = (image: BlogImage | null) => {
    if (image) sections.push({ type: "image", image });
  };

  pushP(introOpen);
  pushP(
    `${short} Current listing price starts around ${price} — always confirm the live amount on the product page before you order.`,
  );

  pushH(`Why shoppers search for ${name} in Pakistan`);
  pushP(whyPakistan);
  pushP(
    `Keywords people use include “${name} price in Pakistan”, “buy ${name} online”, and “${category} COD delivery”. This guide is written to answer those searches with clear next steps.`,
  );

  pushImg(img(1, `${name} product photo — ${storeName}`));

  pushH(`Product spotlight: ${name}`);
  pushP(
    desc
      ? desc.slice(0, 900) + (desc.length > 900 ? "…" : "")
      : `${name} belongs to our ${category} range at ${storeName}. Open the product gallery for close-up photos, then check stock and options before checkout.`,
  );
  if (product.rating > 0 && product.reviews > 0) {
    pushP(
      `Customers have rated ${name} about ${product.rating.toFixed(1)} out of 5 based on ${product.reviews} review${product.reviews === 1 ? "" : "s"} on our store — a useful signal when you compare similar ${category} products.`,
    );
  }

  pushImg(img(2, `${name} detail view for online shoppers in Pakistan`));

  pushH(`Who is ${name} for?`);
  pushP(
    `This ${category} product suits people who want a practical upgrade without a complicated buying process. Common situations include:`,
  );
  pushL(useCases);

  pushH(`How to order ${name} from ${storeName}`);
  pushP(
    `Ordering is straightforward and SEO-friendly pages like this exist so you can research first, then jump straight to the product listing when you are ready.`,
  );
  pushL(buyingSteps);
  sections.push({
    type: "cta",
    text: `Ready to buy ${name}? View live price, photos, and stock on the official product page.`,
    href: `/products/${product.slug}`,
    label: `Shop ${name}`,
  });

  pushImg(img(3, `${name} — order online with COD in Pakistan`));

  pushH(`Quick care and expectation tips`);
  pushL(careTips);

  pushH(`Frequently asked questions about ${name}`);
  for (const q of faqs) {
    pushP(q);
  }

  pushH(`Final verdict`);
  pushP(
    pick(
      [
        `If your search was for ${name} in Pakistan with transparent PKR pricing and COD, ${storeName} is built for that journey. Review the gallery, confirm stock, and place your order when ready.`,
        `${name} is a solid ${category} option when you want clear photos, Pakistan-wide delivery, and a simple checkout. Use the button below to open the product page and complete your purchase.`,
        `Between research and checkout, keep one source of truth: the live ${name} listing on ${storeName}. Prices and availability update there first — this blog helps you decide, then sends you to buy.`,
      ],
      seed + 4,
    ),
  );
  sections.push({
    type: "cta",
    text: `Continue to the ${name} product page to add it to your cart.`,
    href: `/products/${product.slug}`,
    label: "View product & buy",
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

  const metaTitle = `${name} Price in Pakistan | Buy Online`;
  const metaDescription = `Read our guide to ${name} in Pakistan — PKR pricing near ${price}, COD delivery, real product photos, and a direct link to buy at ${storeName}.`;

  const publishedAt = product.createdAt
    ? new Date(product.createdAt).toISOString()
    : new Date("2026-01-15T10:00:00.000Z").toISOString();

  return {
    slug: product.slug,
    productSlug: product.slug,
    title: `${name} in Pakistan — Complete Buying Guide`,
    metaTitle,
    metaDescription,
    publishedAt,
    keywords,
    hero,
    sections,
    articleBodyText,
  };
}

export function blogListingCard(product: Product, storeName: string) {
  const article = buildProductBlogArticle(product, storeName);
  return {
    slug: article.slug,
    title: article.title,
    description: article.metaDescription,
    image: article.hero,
    productSlug: product.slug,
    href: `/blogs/${product.slug}`,
    productHref: `/products/${product.slug}`,
  };
}
