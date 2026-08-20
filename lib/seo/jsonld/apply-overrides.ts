/**
 * Shallow-merge admin `seo_meta.json_ld_overrides` onto a generated JSON-LD node.
 * Empty / missing overrides are a no-op so storefront generators stay authoritative.
 */
export function applyJsonLdOverrides(
  base: Record<string, unknown>,
  overrides: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!overrides) return base;
  const keys = Object.keys(overrides);
  if (keys.length === 0) return base;
  return { ...base, ...overrides };
}
