/**
 * Display name for the storefront. Set `NEXT_PUBLIC_STORE_NAME` per deployment
 * (each server / tenant). Catalogs do not define a store name.
 */
const FALLBACK = "Store Name";

export function getPublicStoreName(): string {
  const raw = process.env.NEXT_PUBLIC_STORE_NAME;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.length > 0) return t;
  }
  return FALLBACK;
}
