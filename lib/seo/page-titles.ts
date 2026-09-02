import { collectionDisplayName } from "@/lib/catalog/collection-nav";

/** Homepage `<title>` base (site suffix applied by buildPageMetadata). ~56 chars with brand. */
export const HOME_METADATA_TITLE = "Everyday Essentials Online in Pakistan";

/**
 * Collection listing title base — matches money-page SEO pattern.
 * Example: "Kitchen Essentials in Pakistan | SimpleCartStore"
 */
export function collectionMetadataTitle(slug: string, fallbackName: string): string {
  const name = collectionDisplayName(slug, fallbackName);
  if (/\bin Pakistan\b/i.test(name)) return name;
  return `${name} in Pakistan`;
}

/** Product PDP title base — commercial intent without duplicating the site suffix. */
export function productMetadataTitle(productName: string): string {
  const name = (productName ?? "").trim();
  if (!name) return name;
  if (/\bin Pakistan\b/i.test(name)) return name;
  return `${name} in Pakistan`;
}

const BRAND_ONLY_KEYS = new Set([
  "simplecartstore",
  "simplecart",
  "outflint",
  "outflintstore",
]);

/** Collapse for brand-only comparisons (`SimpleCart Store` → `simplecartstore`). */
export function normalizeBrandKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** True when an override is empty or only repeats the store / legacy brand name. */
export function isBrandOnlySeoTitle(title: string, siteName: string): boolean {
  const raw = (title ?? "").trim();
  if (!raw) return true;

  const key = normalizeBrandKey(raw);
  if (!key || BRAND_ONLY_KEYS.has(key)) return true;

  const siteKey = normalizeBrandKey(siteName);
  if (siteKey && key === siteKey) return true;

  // Treat very short generic overrides as unusable (e.g. "Store", "Home").
  if (raw.length <= 12 && /^(store|shop|home|site)$/i.test(raw)) return true;

  return false;
}

/**
 * Ignore admin overrides that only repeat the site name (duplicate/short title audits).
 */
export function resolveMetadataBaseTitle(
  overrideTitle: string | undefined,
  defaultTitle: string,
  siteName: string,
): string {
  const override = overrideTitle?.trim() ?? "";
  const site = siteName.trim();
  const fallback = defaultTitle.trim();

  if (!override || isBrandOnlySeoTitle(override, site)) {
    return fallback || override || site;
  }
  return override;
}
