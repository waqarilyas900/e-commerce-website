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

const nextConfig: NextConfig = {
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
