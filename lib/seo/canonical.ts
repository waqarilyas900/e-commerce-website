/**
 * Canonicalization rules for storefront URLs.
 *
 * Goals:
 *   1. Bare paths are the canonical surface — no trailing slash, no UTM, no `?sort=`.
 *   2. A small set of "content-changing" params per route stays in the canonical
 *      (e.g. `q` on `/search`, future: a curated `color` filter).
 *   3. Listing pages (`/collections/*`, `/s/*`) allow sort/stock/price params on
 *      the canonical so filtered views are indexable without UTMs/gclid noise.
 */

import { getPublicSiteUrl } from "@/lib/site-url";

/** Query params that NEVER belong in a canonical or indexable URL. */
const NEVER_KEEP = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "yclid",
  "msclkid",
  "ref",
  "ref_src",
  "_branch_match_id",
  "mc_cid",
  "mc_eid",
  "session_id",
  "page",
]);

/**
 * Query keys used by `parseCollectionSearchParams` on `/collections/[slug]` and
 * `/s/[slug]` (home section rails). Preserved on canonical; pages stay indexable
 * when only these are present (UTMs etc. still trigger noindex via `NEVER_KEEP`).
 */
export const COLLECTION_LISTING_PARAM_KEYS = ["sort", "stock", "min", "max"] as const;

/**
 * Per-route allow-list of meaningful query params (preserved on canonical and
 * keep page indexable). Everything else collapses to the bare URL.
 */
const ROUTE_ALLOWED_PARAMS: Array<{ test: (p: string) => boolean; allow: string[] }> = [
  { test: (p) => p === "/search" || p.startsWith("/search/"), allow: ["q"] },
  {
    test: (p) => p.startsWith("/collections/"),
    allow: [...COLLECTION_LISTING_PARAM_KEYS],
  },
  {
    test: (p) => p.startsWith("/s/"),
    allow: [...COLLECTION_LISTING_PARAM_KEYS],
  },
];

function pathnameOf(input: string): string {
  if (!input) return "/";
  // Accept absolute URLs or pathnames.
  try {
    const url = new URL(
      input.startsWith("http") ? input : `${getPublicSiteUrl()}${input.startsWith("/") ? input : `/${input}`}`,
    );
    return url.pathname;
  } catch {
    return input.startsWith("/") ? input : `/${input}`;
  }
}

function normalizePath(pathname: string): string {
  let p = pathname.trim();
  if (!p) return "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p;
}

function allowedParamsFor(pathname: string): Set<string> {
  for (const rule of ROUTE_ALLOWED_PARAMS) {
    if (rule.test(pathname)) return new Set(rule.allow);
  }
  return new Set();
}

/**
 * Build the canonical pathname (no origin) for a request. Strips UTMs, sort,
 * pagination, and any param not in the per-route allow-list.
 */
export function canonicalPathFor(
  pathname: string,
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams | null,
): string {
  const path = normalizePath(pathnameOf(pathname));
  if (!searchParams) return path;

  const allowed = allowedParamsFor(path);
  if (allowed.size === 0) return path;

  const out = new URLSearchParams();
  const entries: Array<[string, string]> = [];
  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((v, k) => entries.push([k, v]));
  } else {
    for (const [k, v] of Object.entries(searchParams)) {
      if (Array.isArray(v)) v.forEach((x) => entries.push([k, x ?? ""]));
      else if (typeof v === "string") entries.push([k, v]);
    }
  }
  for (const [k, v] of entries) {
    if (NEVER_KEEP.has(k)) continue;
    if (!allowed.has(k)) continue;
    const trimmed = (v ?? "").trim();
    if (!trimmed) continue;
    out.append(k, trimmed);
  }
  const qs = out.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Absolute canonical URL ready for `<link rel="canonical">`. */
export function canonicalUrlFor(
  pathname: string,
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams | null,
): string {
  return `${getPublicSiteUrl()}${canonicalPathFor(pathname, searchParams)}`;
}

/**
 * True when the request URL has any param that would create faceted/sorted
 * duplicate content. Used to set `robots: noindex` for the rendered request.
 */
export function hasIndexBlockingParams(
  pathname: string,
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams | null,
): boolean {
  if (!searchParams) return false;
  const path = normalizePath(pathnameOf(pathname));
  const allowed = allowedParamsFor(path);
  const entries: string[] = [];
  if (searchParams instanceof URLSearchParams) {
    searchParams.forEach((_, k) => entries.push(k));
  } else {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v == null) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      entries.push(k);
    }
  }
  for (const k of entries) {
    if (NEVER_KEEP.has(k)) return true;
    if (!allowed.has(k)) return true;
  }
  return false;
}

/** Absolutize root-relative URL against the public site origin. */
export function absoluteUrl(pathOrUrl: string): string {
  const t = (pathOrUrl ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `https:${t}`;
  const origin = getPublicSiteUrl();
  return t.startsWith("/") ? `${origin}${t}` : `${origin}/${t}`;
}

function isLocalSeoHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h === "::1" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local")
  );
}

/**
 * Normalizes `seo_meta.canonical_url` overrides so `<link rel="canonical">` and
 * `og:url` always use the storefront public origin (`NEXT_PUBLIC_SITE_URL`).
 *
 * Prevents Search Console "Duplicate without user-selected canonical" when the DB
 * stores `http://`, apex host, protocol-relative, or root-relative URLs while
 * the live site canonical is `https://www.…`.
 */
export function resolveSeoCanonicalOverride(
  overrideRaw: string | null | undefined,
  computedAbsolute: string,
): string {
  const computed = (computedAbsolute ?? "").trim();
  const raw = (overrideRaw ?? "").trim();
  if (!raw) return computed;

  let base: URL;
  try {
    const site = getPublicSiteUrl().replace(/\/$/, "");
    base = new URL(`${site}/`);
  } catch {
    return computed;
  }

  let parsed: URL;
  try {
    if (/^https?:\/\//i.test(raw)) {
      parsed = new URL(raw);
    } else if (raw.startsWith("//")) {
      parsed = new URL(`https:${raw}`);
    } else {
      const p = raw.startsWith("/") ? raw : `/${raw}`;
      parsed = new URL(p, base);
    }
  } catch {
    return computed;
  }

  const rebased = new URL(`${parsed.pathname}${parsed.search}`, base);
  if (
    process.env.NODE_ENV === "production" &&
    rebased.protocol === "http:" &&
    !isLocalSeoHost(rebased.hostname)
  ) {
    rebased.protocol = "https:";
  }

  let href = rebased.href;
  if (rebased.pathname !== "/" && href.endsWith("/")) {
    href = href.replace(/\/+$/, "");
  }
  return href;
}
