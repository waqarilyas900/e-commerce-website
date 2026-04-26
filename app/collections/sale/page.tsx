import { Suspense } from "react";
import type { Metadata } from "next";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { dbListAllActiveProductsForCards } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import { notFound } from "next/navigation";
import { getNavCollectionLinks } from "@/app/lib/nav-collections";
import {
  buildFeaturedIndex,
  filterCollectionProducts,
  maxPriceCeiling,
  parseCollectionSearchParams,
  sortCollectionProducts,
} from "@/app/lib/collection-query";
import { CollectionListingControls } from "@/components/collections/collection-listing-controls";
import type { Product } from "@/app/lib/catalog/types";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
} from "@/lib/seo";
import {
  JsonLd,
  breadcrumbJsonLd,
  collectionJsonLd,
} from "@/lib/seo/jsonld";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = searchParams != null ? await searchParams : {};
  const [identity, override] = await Promise.all([
    loadSiteIdentity(),
    loadSeoOverrideForRoute("/collections/sale"),
  ]);
  const baseDescription = `Sale and discounted products at ${identity.storeName || identity.siteTitle || "our store"}.`;
  return buildPageMetadata({
    pathname: "/collections/sale",
    searchParams: sp,
    identity,
    override,
    defaults: {
      title: "Sale and Discount",
      description: baseDescription,
    },
  });
}

function ListingFallback() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
      </div>
      <div className="grid grid-cols-2 items-start gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:hidden">
        <div className="h-40 max-w-36 animate-pulse rounded-lg bg-neutral-100" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-md bg-neutral-100" />
        ))}
      </div>
      <div className="hidden gap-2 lg:grid lg:grid-cols-4">
        <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />
        <div className="grid min-w-0 grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:col-span-3 lg:grid-cols-3 lg:gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-md bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

function saleBaseline(fromCatalog: Product[]): Product[] {
  return fromCatalog.filter(
    (product) => product.compareAtPrice != null && product.compareAtPrice > product.price,
  );
}

export default async function CollectionsSalePage({ searchParams }: Props) {
  if (!hasCatalogDb()) {
    notFound();
  }

  const sp = searchParams != null ? await searchParams : {};
  const parsed = parseCollectionSearchParams(sp);

  const base = await dbListAllActiveProductsForCards();
  const baseline = saleBaseline(base);

  const navLinks = await getNavCollectionLinks();
  const featuredIndex = buildFeaturedIndex(baseline);
  const maxCeil = maxPriceCeiling(baseline);

  let list = filterCollectionProducts(
    baseline,
    parsed.availability,
    parsed.priceMin,
    parsed.priceMax,
  );
  list = sortCollectionProducts(list, parsed.sort, featuredIndex);

  const canonical = canonicalUrlFor("/collections/sale");
  const collectionLd = collectionJsonLd({
    url: canonical,
    name: "Sale and Discount",
    description: "Discounted products curated from across the catalog.",
    products: baseline,
  });
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Collections", url: "/collections" },
    { name: "Sale", url: "/collections/sale" },
  ]);

  return (
    <>
      <JsonLd id="ld-collection-sale" data={collectionLd} />
      <JsonLd id="ld-breadcrumb-sale" data={crumbs} />
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            Sale and Discount
          </h1>
        </header>

        <section>
          <Suspense fallback={<ListingFallback />}>
            <CollectionListingControls
              maxPriceCeil={maxCeil}
              parsed={parsed}
              currentSlug="sale"
              navLinks={navLinks}
              products={list}
            />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}
