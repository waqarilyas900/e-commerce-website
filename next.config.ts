import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Next 16 defaults to Turbopack for `next build`; empty config acknowledges coexistence with `webpack`. */
  turbopack: {},
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
  images: {
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
      /** Supabase Storage public URLs (home hero, collection heroes, product media) */
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
