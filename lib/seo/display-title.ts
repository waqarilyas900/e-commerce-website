/**
 * Turn seo_meta titles into clean on-page H1 / breadcrumb labels.
 * Keeps local intent ("Pakistan") but drops awkward "PK" / brand suffixes.
 */
export function seoHeadingFromMetaTitle(
  seoTitle: string | null | undefined,
  fallback: string,
): string {
  let t = (seoTitle ?? "").trim();
  if (!t) return fallback.trim() || fallback;
  t = t.replace(/\s*[|–—-]\s*SimpleCart\s*Store\s*$/i, "").trim();
  t = t.replace(/\s+PK\s*$/i, " in Pakistan").trim();
  // Avoid double "Pakistan Pakistan"
  t = t.replace(/\bPakistan\s+in\s+Pakistan\b/i, "Pakistan").trim();
  return t || fallback;
}
