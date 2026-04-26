/**
 * Canonicalization rules for storefront URLs.
 *
 * Goals:
 *   1. Bare paths are the canonical surface — no trailing slash, no UTM, no `?sort=`.
 *   2. A small set of "content-changing" params per route stays in the canonical
 *      (e.g. `q` on `/search`, future: a curated `color` filter).
 *   3. Faceted/sort variants of collection pages are noindex,follow with canonical
 *      pointing back to the bare URL.
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
 * Per-route allow-list of meaningful query params (preserved on canonical and
 * keep page indexable). Everything else collapses to the bare URL.
 */
const ROUTE_ALLOWED_PARAMS: Array<{ test: (p: string) => boolean; allow: string[] }> = [
  { test: (p) => p === "/search" || p.startsWith("/search/"), allow: ["q"] },
  // Collection / sale / home-section listing controls — none indexable yet.
  { test: () => false, allow: [] },
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
