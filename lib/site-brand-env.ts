/**
 * Public site brand from environment variables.
 *
 * To change the logo or store name site-wide, update `.env.local`:
 *   NEXT_PUBLIC_SITE_NAME=MELALOOTLO
 *   NEXT_PUBLIC_LOGO_URL=/your-logo.png
 *
 * `NEXT_PUBLIC_LOGO_URL` may be a root-relative path (`/logo.png`) or an absolute URL.
 * Restart the dev server after changing these values.
 */

import type { SiteIdentity } from "@/lib/seo/types";
import type { StoreBrandConfig } from "@/app/lib/store-brand.types";

/** Shown when `NEXT_PUBLIC_SITE_NAME` is unset and no DB name is available. */
export const FALLBACK_SITE_NAME = "Store";

/** Local placeholder when `NEXT_PUBLIC_LOGO_URL` is unset (`public/melalootlo_logo.jpeg`). */
export const FALLBACK_LOGO_URL = "/melalootlo_logo.jpeg";

export function getEnvSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() ?? "";
}

export function getEnvLogoUrl(): string {
  return process.env.NEXT_PUBLIC_LOGO_URL?.trim() ?? "";
}

export function isRemoteAssetUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/** Display / UI site name: env → candidates → fallback. */
export function resolveSiteName(...candidates: (string | null | undefined)[]): string {
  const fromEnv = getEnvSiteName();
  if (fromEnv) return fromEnv;
  for (const value of candidates) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return FALLBACK_SITE_NAME;
}

/** Logo `src` for components: env → candidates → `FALLBACK_LOGO_URL`. */
export function resolveLogoUrl(...candidates: (string | null | undefined)[]): string {
  const fromEnv = getEnvLogoUrl();
  if (fromEnv) return fromEnv;
  for (const value of candidates) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return FALLBACK_LOGO_URL;
}

/** SEO JSON-LD organization logo: env → DB only (no placeholder asset). */
export function resolveOrganizationLogoUrl(
  ...candidates: (string | null | undefined)[]
): string {
  const fromEnv = getEnvLogoUrl();
  if (fromEnv) return fromEnv;
  for (const value of candidates) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function applyEnvToSiteIdentity(identity: SiteIdentity): SiteIdentity {
  const name = getEnvSiteName();
  const logo = getEnvLogoUrl();
  if (!name && !logo) return identity;
  return {
    ...identity,
    ...(name ? { siteTitle: name, storeName: name } : {}),
    ...(logo ? { organizationLogoUrl: logo } : {}),
  };
}

export function applyEnvToStoreBrand(brand: StoreBrandConfig): StoreBrandConfig {
  const name = getEnvSiteName();
  const logo = getEnvLogoUrl();
  if (!name && !logo) return brand;
  return {
    ...brand,
    ...(name ? { storeName: name, siteTitle: name } : {}),
    ...(logo ? { faviconUrl: logo } : {}),
  };
}
