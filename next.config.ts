import type { NextConfig } from "next";

/** Comma-separated hostnames for `next dev` when using LAN IP (e.g. `192.168.1.5`). */
function extraDevOrigins(): string[] {
  const raw = process.env.NEXT_EXTRA_DEV_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Optional Next/Image remote host for your storefront or CDN (no protocol). */
function storefrontImageRemotePattern():
  | { protocol: "https"; hostname: string; pathname: string }
  | undefined {
  const explicit = process.env.NEXT_PUBLIC_CDN_IMAGE_HOST?.trim();
  if (explicit) {
    const pathname = (process.env.NEXT_PUBLIC_CDN_IMAGE_PATHNAME?.trim() || "/**").replace(
      /^([^/])/,
      "/$1",
    );
    return { protocol: "https", hostname: explicit, pathname };
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) return undefined;
  try {
    const hostname = new URL(site).hostname;
    if (!hostname) return undefined;
    return { protocol: "https", hostname, pathname: "/**" };
  } catch {
    return undefined;
  }
}

const storefrontImages = storefrontImageRemotePattern();

/** Comma-separated hostnames (no protocol), e.g. `img.kwcdn.com,cdn.vendor.com` — merged into `images.remotePatterns`. */
function extraImageHostsFromEnv(): {
  protocol: "https";
  hostname: string;
  pathname: string;
}[] {
  const raw = process.env.NEXT_PUBLIC_EXTRA_IMAGE_HOSTS?.trim();
  if (!raw) return [];
  const out: { protocol: "https"; hostname: string; pathname: string }[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    let h = part.trim();
    if (!h) continue;
    h = h.replace(/^https:\/\//i, "").replace(/^http:\/\//i, "");
    const slash = h.indexOf("/");
    if (slash >= 0) h = h.slice(0, slash);
    const colon = h.indexOf(":");
    if (colon >= 0) h = h.slice(0, colon);
    if (!/^[a-zA-Z0-9*.-]+$/.test(h)) continue;
    const key = h.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ protocol: "https", hostname: h, pathname: "/**" });
  }
  return out;
}

/**
 * Common supplier CDNs (dropship imports). Use explicit host + `*.kwcdn.com` — `**.kwcdn.com`
 * does not match `img.kwcdn.com` reliably in Next 16 image config.
 */
const commonProductImageHosts: {
  protocol: "https";
  hostname: string;
  pathname: string;
}[] = [
  { protocol: "https", hostname: "img.kwcdn.com", pathname: "/**" },
  { protocol: "https", hostname: "*.kwcdn.com", pathname: "/**" },
  { protocol: "https", hostname: "m.media-amazon.com", pathname: "/**" },
  { protocol: "https", hostname: "*.media-amazon.com", pathname: "/**" },
  { protocol: "https", hostname: "ibrahimstores.com", pathname: "/**" },
  { protocol: "https", hostname: "www.ibrahimstores.com", pathname: "/**" },
  // Squarespace asset CDN — many imported supplier feeds reference
  // `images.squarespace-cdn.com/...?format=...` URLs. Both the explicit host
  // and the single-level wildcard are listed because Next 16 image config
  // matches `*` exactly one subdomain segment and the supplier links can
  // also originate from `static.squarespace.com`.
  { protocol: "https", hostname: "images.squarespace-cdn.com", pathname: "/**" },
  { protocol: "https", hostname: "*.squarespace-cdn.com", pathname: "/**" },
  { protocol: "https", hostname: "static1.squarespace.com", pathname: "/**" },
  { protocol: "https", hostname: "*.squarespace.com", pathname: "/**" },
  // Joom supplier CDN — e.g. `img.joomcdn.net/<hash>_original.jpeg`.
  { protocol: "https", hostname: "img.joomcdn.net", pathname: "/**" },
  { protocol: "https", hostname: "*.joomcdn.net", pathname: "/**" },
];

// Note: the ProductCard on storefront grids falls back to plain `<img>` for
// any host not served by us, Supabase Storage, or our CDN — see
// `productImageUseNativeImg` in `components/storefront.tsx`. The entries in
// `commonProductImageHosts` are only needed for code paths that still use
// `next/image` directly (e.g. Server Components rendering supplier URLs).

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Retired landing pages — keep permanent redirects so search engines
      // drop them and consolidate signals to the collections index.
      { source: "/bundles", destination: "/collections", permanent: true },
      { source: "/collections/sale", destination: "/collections", permanent: true },
      { source: "/sale", destination: "/collections", permanent: true },
      // Legacy renamed collection slug.
      { source: "/collections/needle-case", destination: "/collections", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/favicon.ico",
          destination: "/store-favicon",
        },
      ],
    };
  },
  /** Next 16 defaults to Turbopack for `next build`; empty config acknowledges coexistence with `webpack`. */
  turbopack: {},
  /** Dev HMR: `127.0.0.1` plus optional `NEXT_EXTRA_DEV_ORIGINS` (comma-separated hostnames). */
  allowedDevOrigins: ["127.0.0.1", ...extraDevOrigins()],
  /**
   * Dev-only: use in-memory webpack cache instead of PackFileCacheStrategy on disk.
   * Avoids intermittent ENOENT on rename of `*.pack.gz_` → `*.pack.gz` when `.next` is
   * cleared mid-run, multiple clients compile at once, or cache dirs race.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      ...(storefrontImages ? [storefrontImages] : []),
      ...commonProductImageHosts,
      ...extraImageHostsFromEnv(),
      /** Supabase Storage public URLs (home hero, collection heroes, product media, reviews) */
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
