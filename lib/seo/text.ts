/** Small text utilities used by metadata + JSON-LD. Pure; no dependencies. */

const HTML_TAG_RE = /<[^>]+>/g;
const WHITESPACE_RE = /\s+/g;

export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(HTML_TAG_RE, " ").replace(WHITESPACE_RE, " ").trim();
}

/**
 * Clamp to N characters without cutting a word in half. Adds an ellipsis when truncated.
 * Uses code-point length so multi-byte glyphs (Urdu, emoji) don't blow up.
 */
export function clampText(input: string, max: number): string {
  if (!input) return "";
  const cleaned = input.replace(WHITESPACE_RE, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(max * 0.6) ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

/** Title is clamped to 70 chars (Google shows ~60 px-rendered; 70 is a safe ceiling). */
export const SEO_TITLE_MAX = 70;

/** Meta description sweet spot: 120–160 characters. */
export const SEO_DESCRIPTION_MAX = 160;

export function clampSeoTitle(input: string): string {
  return clampText(input, SEO_TITLE_MAX);
}

export function clampSeoDescription(input: string): string {
  return clampText(input, SEO_DESCRIPTION_MAX);
}

/** Build a "<part> | <site>" title without overflowing the 70-char ceiling. */
export function suffixTitle(part: string, site: string): string {
  const cleanPart = (part ?? "").trim();
  const cleanSite = (site ?? "").trim();
  if (!cleanPart) return clampSeoTitle(cleanSite);
  if (!cleanSite) return clampSeoTitle(cleanPart);
  if (cleanPart.toLowerCase() === cleanSite.toLowerCase()) {
    return clampSeoTitle(cleanPart);
  }

  // Drop leftover brand suffixes from seo_meta so we never double-brand titles.
  const pagePart = cleanPart
    .replace(/\s*[|·–—\-]\s*simple\s*cart(?:\s*store)?\s*$/i, "")
    .trim();
  const base = pagePart || cleanPart;

  if (base.toLowerCase() === cleanSite.toLowerCase()) {
    return clampSeoTitle(base);
  }
  const suffixRe = new RegExp(
    `[\\s|·–—\\-]+${cleanSite.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}$`,
    "i",
  );
  if (suffixRe.test(base)) return clampSeoTitle(base);

  const full = `${base} | ${cleanSite}`;
  if (full.length <= SEO_TITLE_MAX) return full;
  const room = SEO_TITLE_MAX - cleanSite.length - 3;
  if (room > 12) {
    return `${clampText(base, room)} | ${cleanSite}`;
  }
  return clampSeoTitle(base);
}
