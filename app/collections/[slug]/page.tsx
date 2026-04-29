import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { dbGetCollectionBySlug, dbListProductsByCollectionSlug } from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
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
  loadSeoOverrideForSubject,
  loadSiteIdentity,
} from "@/lib/seo";
import {
  JsonLd,
  breadcrumbJsonLd,
  collectionJsonLd,
} from "@/lib/seo/jsonld";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function ListingFallback() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
      </div>
      <div className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:hidden">
        <div className="h-40 max-w-36 animate-pulse rounded-lg bg-neutral-100" />
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
      <div className="hidden gap-2 lg:grid lg:grid-cols-4 lg:gap-2">
        <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />
        <div className="grid min-w-0 grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:col-span-3 lg:grid-cols-3 lg:gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams != null ? await searchParams : {};
  const pathname = `/collections/${slug}`;

  if (!hasCatalogDb()) {
    const identity = await loadSiteIdentity();
    return buildPageMetadata({
      pathname,
      searchParams: sp,
      identity,
      override: null,
      defaults: { title: "Collection", description: identity.siteDescription, forceNoindex: true },
    });
  }

  const [collection, identity] = await Promise.all([
    dbGetCollectionBySlug(slug),
    loadSiteIdentity(),
  ]);

  if (!collection) {
    return buildPageMetadata({
      pathname,
      searchParams: sp,
      identity,
      override: null,
      defaults: { title: "Collection not found", description: identity.siteDescription, forceNoindex: true },
    });
  }

// this is comment line
// aaa
  const override = await loadSeoOverrideForSubject("collection", collection.id, identity.locale);

  return buildPageMetadata({
    pathname,
    searchParams: sp,
    identity,
    override,
    defaults: {
      title: collection.name,
      description: collection.description,
      images: collection.hero_image
        ? [{ url: collection.hero_image, alt: collection.name }]
        : [],
    },
  });
}

export default async function CollectionDetailsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = searchParams != null ? await searchParams : {};
  const parsed = parseCollectionSearchParams(sp);

  let collection: {
    slug: string;
    name: string;
    description: string;
    heroImage: string;
  } | null = null;

  let baseline: Product[] = [];

  if (!hasCatalogDb()) {
    notFound();
  }

  const dbCol = await dbGetCollectionBySlug(slug);
  if (dbCol) {
    collection = {
      slug: dbCol.slug,
      name: dbCol.name,
      description: dbCol.description,
      heroImage: dbCol.hero_image,
    };
    baseline = await dbListProductsByCollectionSlug(slug);
  }

  if (!collection) {
    notFound();
  }

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

  const canonical = canonicalUrlFor(`/collections/${slug}`);
  const collectionLd = collectionJsonLd({
    url: canonical,
    name: collection.name,
    description: collection.description,
    products: baseline,
  });
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Collections", url: "/collections" },
    { name: collection.name, url: `/collections/${slug}` },
  ]);

  return (
    <>
      <JsonLd id="ld-collection" data={collectionLd} />
      <JsonLd id="ld-breadcrumb" data={crumbs} />
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            {collection.name}
          </h1>
        </header>

        <section>
          <Suspense fallback={<ListingFallback />}>
            <CollectionListingControls
              maxPriceCeil={maxCeil}
              parsed={parsed}
              currentSlug={slug}
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
