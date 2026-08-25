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

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/terms", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  return buildPageMetadata({
    pathname: "/terms",
    identity,
    override,
    defaults: {
      title: "Terms & Conditions",
      description: `Read the Terms & Conditions for shopping at ${storeName}, including orders, payment, delivery, and use of our website in Pakistan.`,
    },
  });
}

export default async function TermsPage() {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/terms", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/terms"),
  );
  const title = override?.title?.trim() || "Terms & Conditions";
  const description =
    override?.description?.trim() ||
    `Read the Terms & Conditions for shopping at ${storeName}, including orders, payment, delivery, and use of our website in Pakistan.`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Terms & Conditions", url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;

  const pageLd = webPageJsonLd({
    url: canonical,
    name: title,
    description,
    identity,
    breadcrumbId,
  });

  return (
    <>
      <JsonLd id="ld-terms" data={pageLd} />
      <JsonLd id="ld-terms-breadcrumb" data={crumbs} />
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
            <span className="font-medium text-neutral-900">Terms &amp; Conditions</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.50rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              Terms &amp; Conditions
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
              The rules that apply when you shop with {storeName}.
            </p>
          </header>

          <article className="space-y-6 py-8 text-base leading-relaxed text-neutral-700 sm:text-[1.05rem]">
            <p>
              By browsing or placing an order on{" "}
              <strong className="font-semibold text-neutral-900">{storeName}</strong>,
              you agree to these Terms &amp; Conditions. If you do not agree, please do
              not use the website or place an order.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">Orders &amp; pricing</h2>
            <p>
              Product prices, stock, and offers can change at any time. An order is
              confirmed when we accept it and begin processing. We may cancel an order
              if an item is unavailable, priced incorrectly, or if we cannot verify
              delivery details.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">Payment</h2>
            <p>
              Cash on delivery (COD) and other payment options shown at checkout are
              available subject to location and order total. You are responsible for
              paying the amount shown before you confirm the order, including any
              shipping fee.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">Delivery</h2>
            <p>
              We deliver across Pakistan. Delivery times are estimates and may vary by
              city, courier capacity, and product availability. Risk of loss passes to
              you when the order is delivered to the address you provided.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">Returns &amp; products</h2>
            <p>
              Damaged, incorrect, or defective items are handled under our{" "}
              <Link
                href="/policies"
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                policies
              </Link>
              . Please check your parcel on arrival and contact us promptly if something
              is wrong.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">Website use</h2>
            <p>
              You may use this site for personal shopping only. Do not misuse the site,
              attempt unauthorized access, or copy product content for commercial use
              without permission.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">Contact</h2>
            <p>
              Questions about these terms? Reach us via{" "}
              <Link
                href="/contact"
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Contact us
              </Link>
              . We are available Mon–Sat, 10:00 AM – 8:00 PM.
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
