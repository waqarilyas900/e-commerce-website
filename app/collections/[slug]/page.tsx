import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Footer, Header, TopStrip } from "@/components/storefront";
import { getCollectionBySlug, products } from "@/app/lib/store-data";
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

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function ListingFallback() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
      </div>
      <div className="grid grid-cols-2 items-start gap-4 sm:gap-6 md:grid-cols-3 lg:hidden">
        <div className="h-40 max-w-[9rem] animate-pulse rounded-lg bg-neutral-100" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-md bg-neutral-100" />
        ))}
      </div>
      <div className="hidden gap-6 lg:grid lg:grid-cols-4">
        <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />
        <div className="grid min-w-0 grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:col-span-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-md bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
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

  let baseline: Product[] = products.filter((product) => product.collection === slug);

  if (hasCatalogDb()) {
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
  }

  if (!collection) {
    const staticCol = getCollectionBySlug(slug);
    if (!staticCol) {
      notFound();
    }
    collection = {
      slug: staticCol.slug,
      name: staticCol.name,
      description: staticCol.description,
      heroImage: staticCol.heroImage,
    };
    baseline = products.filter((product) => product.collection === slug);
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

  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
