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
  const override = await loadSeoOverrideForRoute("/how-to-buy", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  return buildPageMetadata({
    pathname: "/how-to-buy",
    identity,
    override,
    defaults: {
      title: "How to Buy",
      description: `Learn how to order from ${storeName} — browse products, add to cart, checkout with COD, and get delivery across Pakistan.`,
    },
  });
}

export default async function HowToBuyPage() {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/how-to-buy", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/how-to-buy"),
  );
  const title = override?.title?.trim() || "How to Buy";
  const description =
    override?.description?.trim() ||
    `Learn how to order from ${storeName} — browse products, add to cart, checkout with COD, and get delivery across Pakistan.`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "How to Buy", url: canonical },
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
      <JsonLd id="ld-how-to-buy" data={pageLd} />
      <JsonLd id="ld-how-to-buy-breadcrumb" data={crumbs} />
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
            <span className="font-medium text-neutral-900">How to Buy</span>
          </nav>

          <header className="mt-8 border-b border-neutral-200/90 pb-8">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl sm:leading-tight">
              How to Buy
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-[1.05rem]">
              Order from {storeName} in a few simple steps.
            </p>
          </header>

          <article className="space-y-6 py-8 text-base leading-relaxed text-neutral-700 sm:text-[1.05rem]">
            <ol className="list-decimal space-y-5 pl-5">
              <li>
                <strong className="font-semibold text-neutral-900">Browse</strong> — Explore{" "}
                <Link
                  href="/collections"
                  className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                >
                  collections
                </Link>{" "}
                or search for a product. Open a product page to check photos, price,
                stock, and details.
              </li>
              <li>
                <strong className="font-semibold text-neutral-900">Add to cart</strong> —
                Choose quantity (and options if shown), then tap Add to cart. You can keep
                shopping or go to checkout when ready.
              </li>
              <li>
                <strong className="font-semibold text-neutral-900">Checkout</strong> — Enter
                your name, phone, and full delivery address. Confirm the items and any
                shipping fee shown before you place the order.
              </li>
              <li>
                <strong className="font-semibold text-neutral-900">Pay</strong> — Cash on
                delivery (COD) is available across Pakistan where shown at checkout. Pay
                when your parcel arrives.
              </li>
              <li>
                <strong className="font-semibold text-neutral-900">Receive</strong> — We
                typically pack within 1–2 business days. Delivery usually takes 2–5
                business days in major cities and 4–8 business days in other areas.
              </li>
            </ol>

            <p>
              Need help before or after ordering? Visit{" "}
              <Link
                href="/contact"
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Contact us
              </Link>{" "}
              — WhatsApp, phone, and email support are available Mon–Sat, 10:00 AM –
              8:00 PM.
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
