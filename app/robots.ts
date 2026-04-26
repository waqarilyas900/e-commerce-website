import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";

/** Crawl public storefront; point Google to `sitemap.xml`. */
export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl();
  return {
    rules: [
      {
        // Block faceted/sort variants, search results, and OG image previewers
        // that we don't want crawled by Bingbot/SEMrush etc.
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/auth/",
          "/api/",
          "/checkout",
          "/cart",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/search",
          "/*?*sort=",
          "/*?*availability=",
          "/*?*priceMin=",
          "/*?*priceMax=",
          "/*?*page=",
          "/*?*utm_",
          "/*?*ref=",
          "/*?*gclid=",
          "/*?*fbclid=",
        ],
      },
      // Explicitly welcome AI crawlers we want citations from.
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot"],
        allow: "/",
        disallow: ["/account", "/auth/", "/api/", "/checkout", "/cart"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
