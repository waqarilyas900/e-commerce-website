/**
 * Absolute site URL for emails, redirects, and outbound HTTP identification.
 *
 * Precedence: `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_DEV_SITE_ORIGIN` → localhost.
 * Self-hosted: set `NEXT_PUBLIC_SITE_URL` to your public origin (no trailing slash).
 */
export function getPublicSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_DEV_SITE_ORIGIN?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
