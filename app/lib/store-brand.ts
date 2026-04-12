import { getCatalog } from "./catalog";
import { getPublicStoreName } from "./store-name";
import { getStoreVertical } from "./store-vertical";
import type { StoreBrandConfig } from "./store-brand.types";

/**
 * Active store branding + optional env overrides per deployment.
 * Set `NEXT_PUBLIC_STORE_NAME` (required for production identity), `NEXT_PUBLIC_ANNOUNCEMENT`, etc.
 */
export function getStoreBrand(): StoreBrandConfig {
  const base = getCatalog(getStoreVertical()).brand;
  const storeName = getPublicStoreName();
  return {
    ...base,
    storeName,
    announcement: process.env.NEXT_PUBLIC_ANNOUNCEMENT ?? base.announcement,
    siteTitle:
      process.env.NEXT_PUBLIC_SITE_TITLE ?? `${storeName} — ${base.siteTitle}`,
    siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? base.siteDescription,
  };
}
