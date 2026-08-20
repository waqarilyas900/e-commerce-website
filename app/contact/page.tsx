import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { Footer, Header, TopStrip } from "@/components/storefront";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
} from "@/lib/seo";
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { getPublicSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/contact", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "our store";
  return buildPageMetadata({
    pathname: "/contact",
    identity,
    override,
    defaults: {
      title: "Contact",
      description: `Get in touch with ${storeName} — orders, product questions, partnerships, and customer support across Pakistan.`,
    },
  });
}

export default async function ContactPage() {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/contact", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "our store";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/contact"),
  );
  const title = override?.title?.trim() || "Contact";
  const description =
    override?.description?.trim() ||
    `Get in touch with ${storeName} — orders, product questions, partnerships, and customer support across Pakistan.`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Contact", url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;

  const contactLd: Record<string, unknown> = {
    ...webPageJsonLd({
      url: canonical,
      name: title,
      description,
      identity,
      breadcrumbId,
    }),
    "@type": "ContactPage",
  };

  if (identity.organizationPhone || identity.organizationEmail) {
    contactLd.mainEntity = {
      "@type": "Organization",
      "@id": `${getPublicSiteUrl()}/#organization`,
      name: storeName,
      telephone: identity.organizationPhone || undefined,
      email: identity.organizationEmail || undefined,
      url: getPublicSiteUrl(),
    };
  }

  return (
    <>
      <JsonLd id="ld-contact" data={contactLd} />
      <JsonLd id="ld-contact-breadcrumb" data={crumbs} />
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-3xl shell-x py-6 sm:py-10"
      >
        <ContactPageContent />
      </main>
      <Footer />
    </>
  );
}
