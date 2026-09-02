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

  if (!override) return fallback || site;
  if (site && override.toLowerCase() === site.toLowerCase()) {
    return fallback || override;
  }
  return override;
}
