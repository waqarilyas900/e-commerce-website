import type { SiteIdentity } from "../types";
import { getPublicSiteUrl } from "@/lib/site-url";

/**
 * WebSite node. Adds a SearchAction so Google may render a sitelinks search box
 * on brand SERPs (https://schema.org/SearchAction).
 */
export function websiteJsonLd(identity: SiteIdentity): Record<string, unknown> {
  const origin = getPublicSiteUrl();
  const name = identity.siteTitle.trim() || identity.storeName.trim() || "Store";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    url: origin,
    name,
    inLanguage: identity.locale?.split("_")[0] || "en",
    publisher: { "@id": `${origin}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
