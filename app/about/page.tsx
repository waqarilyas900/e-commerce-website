import type { Metadata } from "next";
import Link from "next/link";

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
  const override = await loadSeoOverrideForRoute("/about", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  return buildPageMetadata({
    pathname: "/about",
    identity,
    override,
    defaults: {
      title: "About Us",
      description: `Learn about ${storeName} — everyday home, kitchen and beauty essentials with nationwide delivery across Pakistan.`,
    },
  });
}

export default async function AboutPage() {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/about", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/about"),
  );
  const title = override?.title?.trim() || "About Us";
  const description =
    override?.description?.trim() ||
    `Learn about ${storeName} — everyday home, kitchen and beauty essentials with nationwide delivery across Pakistan.`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "About Us", url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;

  const aboutLd: Record<string, unknown> = {
    ...webPageJsonLd({
      url: canonical,
      name: title,
      description,
      identity,
      breadcrumbId,
    }),
    "@type": "AboutPage",
  };

  if (identity.organizationPhone || identity.organizationEmail) {
    aboutLd.mainEntity = {
      "@type": "Organization",
      "@id": `${getPublicSiteUrl()}/#organization`,
      name: storeName,
      url: getPublicSiteUrl(),
      telephone: identity.organizationPhone || undefined,
      email: identity.organizationEmail || undefined,
    };
  }

  return (
    <>
      <JsonLd id="ld-about" data={aboutLd} />
      <JsonLd id="ld-about-breadcrumb" data={crumbs} />
      <main
        id="MainContent"
        className="main-content bg-linear-to-b from-neutral-50 to-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      >
        <div className="mx-auto max-w-3xl shell-x">
          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-neutral-500"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition hover:text-neutral-900">
              Home
            </Link>
            <span className="px-0.5 text-neutral-300" aria-hidden>
              /
            </span>
            <span className="font-medium text-neutral-900">About Us</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              About Us
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
              Your everyday shopping, made simple.
            </p>
          </header>

          <article className="space-y-6 py-8 text-base leading-relaxed text-neutral-700 sm:text-[1.05rem]">
            <p>
              <strong className="font-semibold text-neutral-900">{storeName}</strong>{" "}
              is an online store for practical home, kitchen, and beauty essentials —
              from drinkware and kitchen tools to small appliances, lighting, and
              everyday wellness products.
            </p>
            <p>
              We focus on useful products at fair prices, clear product pages, and
              delivery across Pakistan so ordering feels straightforward from browse
              to doorstep.
            </p>
            <p>
              Cash on delivery is available at checkout. Orders are typically packed
              within 1–2 business days, with delivery usually taking 2–5 business days
              in major cities and 4–8 business days in other areas.
            </p>
            <p>
              Need help with an order or product question? Reach us via{" "}
              <Link
                href="/contact"
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Contact us
              </Link>
              , WhatsApp, phone, or email — we are here Mon–Sat, 10:00 AM – 8:00 PM.
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
