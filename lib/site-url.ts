/**
 * Absolute site URL for emails, redirects, canonicals, sitemap, JSON-LD, and
 * `metadataBase` in `app/layout.tsx`.
 *
 * Precedence: `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_DEV_SITE_ORIGIN` → localhost.
 *
 * **Production HTTPS:** In `NODE_ENV === "production"`, if the resolved origin
 * uses `http://` and the hostname is not a local dev host, it is rewritten to
 * `https://`. That way sitemaps, Open Graph, and canonicals never advertise
 * insecure URLs when env is mis-set to `http://simplecartstore.com` while Cloudflare
 * still serves the shop over TLS (a common source of Search Console / PSI
 * “HTTPS” / page experience noise).
 */
function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, "");
}

function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0") return true;
  if (h === "[::1]" || h === "::1") return true;
  if (h.endsWith(".localhost")) return true;
  if (h.endsWith(".local")) return true;
  return false;
}

export function getPublicSiteUrl(): string {
  const raw = stripTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_DEV_SITE_ORIGIN?.trim() ||
      "http://localhost:3000",
  );

  try {
    const u = new URL(raw);
    if (
      process.env.NODE_ENV === "production" &&
      u.protocol === "http:" &&
      !isLocalDevHost(u.hostname)
    ) {
      u.protocol = "https:";
    }
    const origin = stripTrailingSlash(u.origin);
    const pathOnly =
      u.pathname === "/" ? "" : stripTrailingSlash(u.pathname);
    const tail = `${u.search}${u.hash}`;
    if (!pathOnly && !tail) return origin;
    return stripTrailingSlash(`${origin}${pathOnly}${tail}`);
  } catch {
    return raw;
  }
}
