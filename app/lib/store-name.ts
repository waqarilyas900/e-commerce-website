/**
 * Narrow escape hatch for modules that cannot await `store_settings` (e.g. some email templates).
 * Prefer keeping `NEXT_PUBLIC_STORE_NAME` aligned with `store_settings.store_name` row id=1.
 */
export function getPublicStoreName(): string {
  const t = process.env.NEXT_PUBLIC_STORE_NAME?.trim();
  return t && t.length > 0 ? t : "Store";
}
