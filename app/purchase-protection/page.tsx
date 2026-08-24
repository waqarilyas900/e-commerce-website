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
  const override = await loadSeoOverrideForRoute(
    "/purchase-protection",
    identity.locale,
  );
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  return buildPageMetadata({
    pathname: "/purchase-protection",
    identity,
    override,
    defaults: {
      title: "Purchase Protection",
      description: `Shop with confidence at ${storeName}. Learn how we protect your purchase — secure checkout, careful packing, and help if something goes wrong.`,
    },
  });
}

export default async function PurchaseProtectionPage() {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute(
    "/purchase-protection",
    identity.locale,
  );
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/purchase-protection"),
  );
  const title = override?.title?.trim() || "Purchase Protection";
  const description =
    override?.description?.trim() ||
    `Shop with confidence at ${storeName}. Learn how we protect your purchase — secure checkout, careful packing, and help if something goes wrong.`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Purchase Protection", url: canonical },
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
      <JsonLd id="ld-purchase-protection" data={pageLd} />
      <JsonLd id="ld-purchase-protection-breadcrumb" data={crumbs} />
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
            <span className="font-medium text-neutral-900">Purchase Protection</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              Purchase Protection
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
              How {storeName} helps you shop with confidence.
            </p>
          </header>

          <article className="space-y-6 py-8 text-base leading-relaxed text-neutral-700 sm:text-[1.05rem]">
            <p>
              We want every order to arrive as expected. Purchase Protection covers the
              basics we stand behind when you buy from{" "}
              <strong className="font-semibold text-neutral-900">{storeName}</strong>.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">
              Clear checkout
            </h2>
            <p>
              Prices, stock status, and shipping fees (if any) are shown before you place
              an order. Cash on delivery is available where offered so you can pay when
              the parcel arrives.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">
              Careful packing
            </h2>
            <p>
              Orders are packed carefully within 1–2 business days. We aim to reduce
              damage in transit and to send the correct item as described on the product
              page.
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">
              If something is wrong
            </h2>
            <p>
              If your order arrives damaged, incorrect, or defective, contact us within 7
              days of delivery via{" "}
              <Link
                href="/contact"
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Contact us
              </Link>
              . Include your order details and photos when possible so we can review a
              return or replacement under our{" "}
              <Link
                href="/policies"
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Return Policy
              </Link>
              .
            </p>

            <h2 className="pt-2 text-lg font-semibold text-neutral-900">Support</h2>
            <p>
              Friendly help is available Mon–Sat, 10:00 AM – 8:00 PM by WhatsApp, phone,
              or email. We will guide you through the next steps for your order.
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
