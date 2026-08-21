import type { SiteIdentity } from "../types";
import { getPublicSiteUrl } from "@/lib/site-url";

/**
 * WebSite node. SearchAction is omitted because `/search` is disallowed in
 * robots.txt — pointing Google at a blocked search URL creates dead sitelinks.
 */
export function websiteJsonLd(identity: SiteIdentity): Record<string, unknown> {
  const origin = getPublicSiteUrl();
  const name = identity.siteTitle.trim() || identity.storeName.trim() || "Store";
  const locale = (identity.locale || "en_PK").replace(/_/g, "-");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    url: origin,
    name,
    inLanguage: locale,
    publisher: { "@id": `${origin}/#organization` },
  };
}
