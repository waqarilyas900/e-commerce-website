import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Pin Turbopack to this app so a parent-folder `package-lock.json` does not become the inferred workspace root (build warning + wrong resolution). */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Tree-shake heavy client packages to smaller per-route bundles (no UI change). */
  experimental: {
    optimizePackageImports: ["framer-motion", "sonner"],
  },
  /** Next 16 defaults to Turbopack for `next build`; root pins this package when multiple lockfiles exist above it. */
  turbopack: {
    root: turbopackRoot,
  },
  /** Allow HMR / dev assets when opening the site via 127.0.0.1 or LAN IP (not only localhost). */
  allowedDevOrigins: ["127.0.0.1", "192.168.18.142"],
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
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "radstore.pk",
        pathname: "/cdn/**",
      },
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
