import type { StoreCatalog } from "./types";

/** Minimal fallback when a non-default vertical is selected; avoids empty hero rails. */
export function createStubVerticalCatalog(siteTitle: string): StoreCatalog {
  const placeholderImg =
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80";
  return {
    brand: {
      siteTitle,
      siteDescription: "Catalog not configured for this vertical.",
      faviconUrl: "",
      announcement: "",
      missionParagraph: "Browse our main collection for available products.",
      featured: {
        eyebrow: siteTitle,
        title: "Collections",
        description: "Catalog is served from the database; seed demo data with npm run seed:catalog and optional SEED_VERTICAL.",
        imageUrl: placeholderImg,
        primaryLabel: "Shop",
        primaryHref: "/collections",
        secondaryLabel: "Contact",
        secondaryHref: "/contact",
      },
      whyShop: {
        eyebrow: "Support",
        title: "We are here to help",
        body: "Reach out if you need product guidance or order support.",
        ctaLabel: "Contact",
        ctaHref: "/contact",
        reviewsLine: "",
        imageUrl: placeholderImg,
      },
      footer: {
        supportEmail: process.env.NEXT_PUBLIC_DEFAULT_SUPPORT_EMAIL?.trim() || "",
        phone: "",
        hoursLine: "",
        exploreLinks: [{ label: "All collections", href: "/collections" }],
        customerCareSectionTitle: "Customer care",
        policyFooterLinks: [],
      },
    },
    products: [],
    collections: [],
    bundles: [],
    homeHeroSlides: [
      { title: "Shop", href: "/collections", image: placeholderImg },
    ],
    homeCategoryRails: [],
  };
}
