/**
 * Server-safe rich HTML sanitizer (no `jsdom`).
 *
 * Used wherever we ingest TipTap/admin-edited HTML and render it via
 * `dangerouslySetInnerHTML`. We sanitize on the **server** (RSC, page server
 * components, server actions) and pass the cleaned string to client components
 * — so `<head>` / Open Graph / first paint never depend on hydration, and we
 * never pull `jsdom` (the cause of `ERR_REQUIRE_ESM` on serverless) into the
 * server bundle.
 */

import sanitizeHtml from "sanitize-html";

/**
 * Allowed tag set covers what TipTap emits in the admin editors plus a few
 * commonly-pasted text-formatting tags. Anything outside the list is stripped
 * (its text content is preserved by default in `sanitize-html`).
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "span",
  "div",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "small",
  "sub",
  "sup",
  "mark",
  "code",
  "pre",
  "kbd",
  "samp",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "img",
  "figure",
  "figcaption",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

/**
 * `sanitize-html` understands `*` to allow an attribute on any tag. We keep the
 * list intentionally short — class is allowed for prose styling hooks the admin
 * may emit, but `style` is dropped to avoid CSS-based injection.
 */
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  "*": ["class", "id", "lang", "dir", "title", "aria-label", "aria-hidden"],
  a: ["href", "name", "target", "rel"],
  img: ["src", "srcset", "alt", "title", "width", "height", "loading", "decoding"],
  table: ["align"],
  th: ["colspan", "rowspan", "scope"],
  td: ["colspan", "rowspan"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"] as const;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: [...ALLOWED_SCHEMES],
  allowedSchemesByTag: {
    a: [...ALLOWED_SCHEMES],
    img: ["http", "https", "data"],
  },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    // Anchors that point off-site MUST drop opener / referrer for security.
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      const href = (attribs.href ?? "").trim();
      if (href && /^https?:\/\//i.test(href)) {
        out.target = attribs.target?.trim() || "_blank";
        const existingRel = (attribs.rel ?? "").toLowerCase();
        const required = ["noopener", "noreferrer"];
        const merged = new Set(
          existingRel.split(/\s+/).filter(Boolean).concat(required),
        );
        out.rel = Array.from(merged).join(" ");
      }
      return { tagName, attribs: out };
    },
  },
};

/**
 * Sanitize a TipTap/admin-supplied HTML string.
 *
 * Returns an empty string for nullish / empty inputs so callers can branch on
 * truthiness without remembering to trim first.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  const trimmed = html.trim();
  if (!trimmed) return "";
  try {
    return sanitizeHtml(trimmed, SANITIZE_OPTIONS);
  } catch {
    return "";
  }
}

/**
 * Sanitize an array of HTML fragments, dropping entries that come back empty
 * (so the announcement-bar rotator never pulses on a blank message).
 */
export function sanitizeRichHtmlList(
  items: ReadonlyArray<string | null | undefined>,
): string[] {
  const out: string[] = [];
  for (const raw of items) {
    const safe = sanitizeRichHtml(raw);
    if (safe) out.push(safe);
  }
  return out;
}
