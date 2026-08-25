import type { StoreCatalog } from "./types";

/**
 * Default SimpleCartStore demo catalog for local seeding (`npm run seed:demo`).
 * Tailoring supplies: presser feet, needles, guides, machine oil, notions.
 */
const COLLECTION_SLUG = "stitching-accessories";

export const simpleCartStoreDemoCatalog: StoreCatalog = {
  brand: {
    siteTitle: "SimpleCartStore",
    siteDescription:
      "Tailoring supplies, industrial sewing parts, and presser feet — clear specs, fair pricing, and fast delivery across Pakistan.",
    faviconUrl: "/brand/favicon.png",
    navbarVariant: "v1",
    announcement: "FREE shipping on orders over Rs. 3,000 · Easy returns within 14 days",
    missionParagraph:
      "We stock presser feet, needles, guides, oil, and machine accessories for tailors and workshops — with transparent pricing and stock you can trust.",
    featured: {
      eyebrow: "Tailoring & stitching",
      title: "Presser feet & machine parts",
      description:
        "Industrial and home-machine compatible feet, guides, and spare parts — curated for Pakistani tailors and garment workshops.",
      imageUrl:
        "https://images.unsplash.com/photo-1589829085416-3888a9178d62?auto=format&fit=crop&w=1400&q=80",
      primaryLabel: "Shop accessories",
      primaryHref: `/collections/${COLLECTION_SLUG}`,
      secondaryLabel: "All collections",
      secondaryHref: "/collections",
    },
    whyShop: {
      eyebrow: "Why SimpleCartStore",
      title: "REAL PARTS. REAL SUPPORT.",
      body:
        "Every listing shows variant-level pricing and stock. Sale items show compare-at pricing so you know the deal. Questions? Our team replies within one business day.",
      ctaLabel: "Shop stitching accessories",
      ctaHref: `/collections/${COLLECTION_SLUG}`,
      reviewsLine: "Customers rate us highly on delivery and product accuracy.",
      imageUrl:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
    },
    footer: {
      supportEmail: "support@example.com",
      phone: "0300-0000000",
      hoursLine: "Mon–Sat 9am–6pm",
      exploreLinks: [
        { label: "Stitching accessories", href: `/collections/${COLLECTION_SLUG}` },
        { label: "All products", href: "/collections" },
      ],
      customerCareSectionTitle: "Customer care",
      policyFooterLinks: [],
    },
  },
  homeHeroSlides: [
    {
      title: "Presser feet & guides",
      href: `/collections/${COLLECTION_SLUG}`,
      image:
        "https://images.unsplash.com/photo-1589829085416-3888a9178d62?auto=format&fit=crop&w=2400&q=80",
    },
    {
      title: "Needles & notions",
      href: `/collections/${COLLECTION_SLUG}`,
      image:
        "https://images.unsplash.com/photo-1615526675159-e248c3022908?auto=format&fit=crop&w=2400&q=80",
    },
    {
      title: "Machine care & oil",
      href: `/collections/${COLLECTION_SLUG}`,
      image:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=2400&q=80",
    },
  ],
  homeCategoryRails: [
    {
      title: "Featured tailoring parts",
      viewAllHref: `/collections/${COLLECTION_SLUG}`,
      productSlugs: [
        "scs-universal-presser-foot-kit",
        "scs-thread-snips",
        "scs-hand-needle-assortment",
        "scs-machine-oil-bottle",
      ],
    },
    {
      title: "Tools & guides",
      viewAllHref: `/collections/${COLLECTION_SLUG}`,
      productSlugs: [
        "scs-hand-needle-assortment",
        "scs-machine-oil-bottle",
        "scs-adjustable-edge-guide",
        "scs-universal-presser-foot-kit",
      ],
    },
  ],
  collections: [
    {
      slug: COLLECTION_SLUG,
      name: "Stitching accessories & machine parts",
      description:
        "Presser feet, guides, needles, oil, and spare parts for industrial and domestic sewing — one place for your workshop.",
      heroImage:
        "https://images.unsplash.com/photo-1589829085416-3888a9178d62?auto=format&fit=crop&w=2000&q=80",
    },
  ],
  bundles: [],
  products: [
    {
      id: "prod-scs-universal-presser-foot-kit",
      slug: "scs-universal-presser-foot-kit",
      name: "Universal presser foot kit",
      shortDescription: "Choose standard shank or industrial high-shank — same reliable feed.",
      description:
        "<p>Two common mounting styles for tailoring machines. Pick the shank that matches your needle bar height.</p>",
      category: "Presser feet",
      collection: COLLECTION_SLUG,
      price: 4990,
      rating: 4.7,
      reviews: 128,
      image:
        "https://images.unsplash.com/photo-1589829085416-3888a9178d62?auto=format&fit=crop&w=1200&q=80",
      tags: ["presser-foot", "industrial", "tailoring"],
    },
    {
      id: "prod-scs-thread-snips",
      slug: "scs-thread-snips",
      name: "Thread snips (spring)",
      shortDescription: "Sharp blades, spring action — Black or White handles.",
      description:
        "<p>Lightweight snips for thread ends at the machine. Same blade steel across both handle colors.</p>",
      category: "Notions",
      collection: COLLECTION_SLUG,
      price: 2490,
      rating: 4.5,
      reviews: 402,
      image:
        "https://images.unsplash.com/photo-1615526675159-e248c3022908?auto=format&fit=crop&w=1200&q=80",
      tags: ["snips", "notions", "tailoring"],
    },
    {
      id: "prod-scs-hand-needle-assortment",
      slug: "scs-hand-needle-assortment",
      name: "Hand needle assortment",
      shortDescription: "10-piece starter or 50-piece workshop pack — promo on the small pack.",
      description:
        "<p>Assorted sizes for basting, upholstery, and fine hand work. The 10-piece pack is on promotion while supplies last.</p>",
      category: "Needles",
      collection: COLLECTION_SLUG,
      price: 1200,
      compareAtPrice: 1650,
      rating: 4.8,
      reviews: 89,
      image:
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80",
      tags: ["needles", "hand-sewing", "sale"],
    },
    {
      id: "prod-scs-machine-oil-bottle",
      slug: "scs-machine-oil-bottle",
      name: "Sewing machine oil",
      shortDescription: "Non-gumming oil — 100 ml or 250 ml bottle.",
      description:
        "<p>Keep hooks and bearings running smooth. Entry size is on sale; the larger bottle is better value for busy workshops.</p>",
      category: "Machine care",
      collection: COLLECTION_SLUG,
      price: 450,
      compareAtPrice: 590,
      rating: 4.4,
      reviews: 256,
      image:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
      tags: ["oil", "maintenance", "machine"],
    },
    {
      id: "prod-scs-adjustable-edge-guide",
      slug: "scs-adjustable-edge-guide",
      name: "Adjustable edge guide foot",
      shortDescription: "Narrow or wide guide × Black or White body.",
      description:
        "<p>Set a consistent seam allowance on industrial flatbeds. Pricing reflects guide width and housing color.</p>",
      category: "Guides",
      collection: COLLECTION_SLUG,
      price: 8490,
      rating: 4.9,
      reviews: 311,
      image:
        "https://images.unsplash.com/photo-1589829085416-3888a9178d62?auto=format&fit=crop&w=1200&q=80",
      tags: ["guide", "presser-foot", "industrial"],
    },
  ],
};
