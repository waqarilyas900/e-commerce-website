/**
 * Shared SEO types. The storefront builds page Metadata from a `SeoSubject` (kind +
 * computed defaults from the entity itself) plus an optional `SeoOverride` (admin
 * row in `public.seo_meta`).
 */

export type SeoSubjectType =
  | "product"
  | "collection"
  | "policy_page"
  | "home_section"
  | "tag"
  | "route"
  | "site_default";

/**
 * Per-page overrides loaded from `public.seo_meta`. Empty strings mean "no override —
 * fall back to computed value".
 */
export type SeoOverride = {
  subjectType: SeoSubjectType;
  subjectId: string | null;
  subjectKey: string | null;
  locale: string;
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  ogImageUrl: string;
  ogImageAlt: string;
  ogImageWidth: number | null;
  ogImageHeight: number | null;
  twitterCard: "summary" | "summary_large_image";
  noindex: boolean;
  nofollow: boolean;
  jsonLdOverrides: Record<string, unknown>;
};

/**
 * Tenant-level identity loaded from `store_settings` for site-wide JSON-LD,
 * verification meta, default OG image, and currency/locale defaults.
 */
export type SiteIdentity = {
  storeName: string;
  siteTitle: string;
  siteDescription: string;
  locale: string;
  currency: string;
  organizationLegalName: string;
  organizationLogoUrl: string;
  organizationPhone: string;
  organizationEmail: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  geo: { lat: number | null; lng: number | null };
  sameAs: string[];
  defaultOgImageUrl: string;
  defaultOgImageAlt: string;
  twitterHandle: string;
  facebookAppId: string;
  verifications: {
    google: string;
    bing: string;
    facebookDomain: string;
    pinterest: string;
    yandex: string;
  };
};

export type SeoImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};
