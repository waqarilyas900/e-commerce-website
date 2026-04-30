export type StoreVerticalId =
  /** Outflint-style tailoring / stitching demo catalog (default seed). */
  | "tailoring"
  | "clothing"
  | "jewellery"
  | "home-compliance";

/** Top strip from admin (home_page_settings); set in root layout from Supabase. */
export type AnnouncementBarSettings = {
  enabled: boolean;
  /**
   * Non-empty rich HTML segments (TipTap), shown in order; storefront crossfades between them.
   * Legacy single `announcement_html` is merged into this list when the array was empty.
   */
  messages: string[];
  /** Time each message is visible before advancing (loop). Clamped server-side (e.g. 3–12s). */
  rotationIntervalMs: number;
  /**
   * First message (or legacy html) for backward compatibility — prefer `messages` in UI.
   * @deprecated use messages
   */
  html: string;
  backgroundColor: string;
  textColor: string;
};

export type StoreBrandConfig = {
  storeName: string;
  siteTitle: string;
  siteDescription: string;
  faviconUrl: string;
  /**
   * When set (root layout), drives the top announcement bar: HTML, colors, rotation.
   */
  announcementBar?: AnnouncementBarSettings;
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
    /** Heading above policy/footer links (Customer care block); from `footer_settings`. */
    customerCareSectionTitle: string;
    /**
     * Admin-defined labels, order, and destinations (resolved `href` per row).
     * The storefront always prepends "Contact us" → `/contact`.
     */
    policyFooterLinks: { label: string; href: string }[];
  };
};

/**
 * Static vertical seed files only — not used for live storefront copy when DB is configured.
 */
export type CatalogBrand = Omit<StoreBrandConfig, "storeName" | "announcementBar"> & {
  announcement: string;
  missionParagraph: string;
};

export type HeroSlide = {
  /** Set when slide comes from DB — stable keys for animation */
  id?: string;
  title: string;
  href: string;
  image: string;
};

export type HomeCategoryRail = {
  title: string;
  viewAllHref: string;
  /** Product slugs (match `products.slug` after seed). */
  productSlugs: string[];
};
