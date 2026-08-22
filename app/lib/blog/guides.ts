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
];

export function getStaticGuideMeta(slug: string): StaticGuideMeta | undefined {
  return STATIC_BLOG_GUIDES.find((g) => g.slug === slug);
}

function pickImages(products: Product[], storeName: string): BlogImage[] {
  const out: BlogImage[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const src = (p.image ?? "").trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push({
      src,
      alt: `${p.name} — shop with WELCOME10 at ${storeName}`,
    });
  }
  return out;
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

export function staticGuideListingCard(storeName: string, heroImage?: string | null) {
  const meta = STATIC_BLOG_GUIDES[0]!;
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
