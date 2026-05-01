import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { Footer, Header, TopStrip } from "@/components/storefront";
import {
  buildPageMetadata,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
} from "@/lib/seo";

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
      description: `Get in touch with ${storeName} — orders, tailoring supplies questions, partnerships, and customer support.`,
    },
  });
}

export default function ContactPage() {
  return (
    <>
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
