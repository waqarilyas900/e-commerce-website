/**
 * Absolute site URL for emails and redirects. Set NEXT_PUBLIC_SITE_URL in production.
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
