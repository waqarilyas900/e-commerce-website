import { absoluteUrl } from "../canonical";
import type { SiteIdentity } from "../types";
import { getPublicSiteUrl } from "@/lib/site-url";

/**
 * Site-wide Organization (or LocalBusiness when a physical address + phone exist).
 * Use a stable `@id` so other entities can reference it via `publisher`/`brand`.
 */
export function organizationJsonLd(identity: SiteIdentity): Record<string, unknown> {
  const origin = getPublicSiteUrl();
  const id = `${origin}/#organization`;
  const name =
    identity.organizationLegalName.trim() ||
    identity.storeName.trim() ||
    identity.siteTitle.trim() ||
    "Store";

  const hasAddress =
    identity.address.street ||
    identity.address.city ||
    identity.address.region ||
    identity.address.postalCode;

  const hasContact = Boolean(identity.organizationPhone || identity.organizationEmail);

  const useLocalBusiness = Boolean(hasAddress && identity.organizationPhone);
  const type = useLocalBusiness ? "Store" : "Organization";

  const node: Record<string, unknown> = {
    "@type": type,
    "@id": id,
    name,
    url: origin,
    sameAs: identity.sameAs.length ? identity.sameAs : undefined,
  };

  if (identity.organizationLogoUrl) {
    node.logo = {
      "@type": "ImageObject",
      url: absoluteUrl(identity.organizationLogoUrl),
    };
    node.image = absoluteUrl(identity.organizationLogoUrl);
  }

  if (hasAddress) {
    node.address = {
      "@type": "PostalAddress",
      streetAddress: identity.address.street || undefined,
      addressLocality: identity.address.city || undefined,
      addressRegion: identity.address.region || undefined,
      postalCode: identity.address.postalCode || undefined,
      addressCountry: identity.address.country || undefined,
    };
  }

  if (identity.geo.lat != null && identity.geo.lng != null) {
    node.geo = {
      "@type": "GeoCoordinates",
      latitude: identity.geo.lat,
      longitude: identity.geo.lng,
    };
  }

  // Top-level NAP fields help local/Knowledge Graph enrichment; ContactPoint
  // remains for customer-service intent.
  if (identity.organizationPhone) {
    node.telephone = identity.organizationPhone;
  }
  if (identity.organizationEmail) {
    node.email = identity.organizationEmail;
  }

  if (hasContact) {
    node.contactPoint = [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: identity.organizationPhone || undefined,
        email: identity.organizationEmail || undefined,
        areaServed: identity.address.country || "PK",
        availableLanguage: ["en", "ur"],
      },
    ];
  }

  return { "@context": "https://schema.org", ...node };
}

/**
 * The id alone (for cross-graph references via `@id`).
 */
export function organizationRef(): { "@id": string } {
  return { "@id": `${getPublicSiteUrl()}/#organization` };
}
