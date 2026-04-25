/**
 * Social URLs for footer / mobile nav. Omit env vars to hide icons (no generic instagram.com fallback).
 */
export function getPublicInstagramUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
  return v && v.length > 0 ? v : undefined;
}

export function getPublicFacebookUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim();
  return v && v.length > 0 ? v : undefined;
}
