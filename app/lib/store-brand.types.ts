export type StoreVerticalId =
  | "electronics"
  | "clothing"
  | "jewellery"
  | "home-compliance";

export type StoreBrandConfig = {
  storeName: string;
  siteTitle: string;
  siteDescription: string;
  announcement: string;
  missionParagraph: string;
  featured: {
    eyebrow: string;
    title: string;
    description: string;
    imageUrl: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  whyShop: {
    eyebrow: string;
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    reviewsLine: string;
    imageUrl: string;
  };
  footer: {
    supportEmail: string;
    phone: string;
    hoursLine: string;
    exploreLinks: { label: string; href: string }[];
  };
};

/** Brand fields from a vertical catalog (no store name — use `getPublicStoreName()`). */
export type CatalogBrand = Omit<StoreBrandConfig, "storeName">;

export type HeroSlide = { title: string; href: string; image: string };

export type HomeCategoryRail = {
  title: string;
  viewAllHref: string;
  /** Product slugs (match `products.slug` after seed). */
  productSlugs: string[];
};
