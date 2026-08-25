/**
 * Public site brand from environment variables.
 *
 * To change the logo or store name site-wide, update `.env`:
 *   NEXT_PUBLIC_SITE_NAME=SimpleCart Store
 *   NEXT_PUBLIC_LOGO_URL=/brand/logo-dark.svg
 *   NEXT_PUBLIC_FOOTER_LOGO_URL=/brand/logo-light.svg
 *   NEXT_PUBLIC_FAVICON_URL=/brand/favicon.png
 *
 * Logo/favicon may be root-relative (`/brand/logo.svg`) or absolute URLs.
 * Restart the dev server after changing these values.
 */

import type { SiteIdentity } from "@/lib/seo/types";
import type { StoreBrandConfig } from "@/app/lib/store-brand.types";

/** Shown when `NEXT_PUBLIC_SITE_NAME` is unset and no DB name is available. */
export const FALLBACK_SITE_NAME = "SimpleCart Store";

/** Header logo (dark mark on light backgrounds). */
export const FALLBACK_LOGO_URL = "/brand/logo-dark.svg";

/** Footer logo (light mark on dark backgrounds). */
export const FALLBACK_FOOTER_LOGO_URL = "/brand/logo-light.svg";

/** Local default when `NEXT_PUBLIC_FAVICON_URL` is unset (`public/brand/favicon.png`). */
export const FALLBACK_FAVICON_URL = "/brand/favicon.png";

export function getEnvSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() ?? "";
}

export function getEnvLogoUrl(): string {
  return process.env.NEXT_PUBLIC_LOGO_URL?.trim() ?? "";
}

export function getEnvFooterLogoUrl(): string {
  return process.env.NEXT_PUBLIC_FOOTER_LOGO_URL?.trim() ?? "";
}

export function getEnvFaviconUrl(): string {
  return process.env.NEXT_PUBLIC_FAVICON_URL?.trim() ?? "";
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

/** Header logo `src`: env → candidates → `FALLBACK_LOGO_URL`. */
export function resolveLogoUrl(...candidates: (string | null | undefined)[]): string {
  const fromEnv = getEnvLogoUrl();
  if (fromEnv) return fromEnv;
  for (const value of candidates) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return FALLBACK_LOGO_URL;
}

/** Footer logo `src`: footer env → candidates → `FALLBACK_FOOTER_LOGO_URL`. */
export function resolveFooterLogoUrl(...candidates: (string | null | undefined)[]): string {
  const fromEnv = getEnvFooterLogoUrl();
  if (fromEnv) return fromEnv;
  for (const value of candidates) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return FALLBACK_FOOTER_LOGO_URL;
}

/** Favicon href: env → candidates → logo env → `FALLBACK_FAVICON_URL`. */
export function resolveFaviconUrl(...candidates: (string | null | undefined)[]): string {
  const fromEnv = getEnvFaviconUrl();
  if (fromEnv) return fromEnv;
  for (const value of candidates) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  const logo = getEnvLogoUrl();
  if (logo) return logo;
  return FALLBACK_FAVICON_URL;
}

/** SEO JSON-LD organization logo: env → candidates → bundled brand logo. */
export function resolveOrganizationLogoUrl(
  ...candidates: (string | null | undefined)[]
): string {
  return resolveLogoUrl(...candidates);
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
  const favicon = getEnvFaviconUrl();
  if (!name && !logo && !favicon) return brand;
  return {
    ...brand,
    ...(name ? { storeName: name, siteTitle: name } : {}),
    ...(favicon || logo ? { faviconUrl: favicon || logo } : {}),
  };
}
