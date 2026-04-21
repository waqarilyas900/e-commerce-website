import type { AnnouncementBarSettings } from "@/app/lib/store-brand.types";
import type { StoreBrandConfig } from "@/app/lib/store-brand.types";

/** Used when root layout data loaders throw (e.g. cookies/SSR edge cases on serverless). */
export const FALLBACK_STORE_BRAND: StoreBrandConfig = {
  storeName: "Store",
  siteTitle: "Store",
  siteDescription: "",
  featured: {
    eyebrow: "",
    title: "",
    description: "",
    imageUrl: "",
    primaryLabel: "",
    primaryHref: "/",
    secondaryLabel: "",
    secondaryHref: "/",
  },
  whyShop: {
    eyebrow: "",
    title: "",
    body: "",
    ctaLabel: "",
    ctaHref: "/",
    reviewsLine: "",
    imageUrl: "",
  },
  footer: {
    supportEmail: "",
    phone: "",
    hoursLine: "",
    exploreLinks: [],
  },
};

export const FALLBACK_ANNOUNCEMENT_BAR: AnnouncementBarSettings = {
  enabled: true,
  messages: [],
  rotationIntervalMs: 5000,
  html: "",
  backgroundColor: "#1c1d1d",
  textColor: "#ffffff",
};
