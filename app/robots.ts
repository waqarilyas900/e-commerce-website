import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";

/** Crawl public storefront; point Google to `sitemap.xml`. */
export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl();
  return {
    rules: [
      {
        // Block private pages + low-value faceted/search variants.
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
          "/*?*stock=",
          "/*?*min=",
          "/*?*max=",
          "/*?*page=",
          "/*?*utm_",
          "/*?*ref=",
          "/*?*gclid=",
          "/*?*fbclid=",
        ],
      },
      // Social crawlers should be able to fetch Open Graph tags reliably.
      {
        userAgent: ["facebookexternalhit", "Facebot", "Twitterbot", "LinkedInBot", "Slackbot"],
        allow: "/",
        disallow: ["/account", "/auth/", "/api/", "/checkout", "/cart"],
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
