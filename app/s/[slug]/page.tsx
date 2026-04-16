import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Footer, Header, TopStrip } from "@/components/storefront";
import {
  dbGetActiveHomePageSectionWithTagsBySlug,
  dbListProductsForHomeSectionTags,
} from "@/app/lib/db/catalog";
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
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-md bg-neutral-100" />
        ))}
      </div>
      <div className="hidden gap-6 lg:grid lg:grid-cols-4">
        <div className="grid min-w-0 grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:col-span-4 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-md bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function HomeSectionListingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = searchParams != null ? await searchParams : {};
  const parsed = parseCollectionSearchParams(sp);

  if (!hasCatalogDb()) {
    notFound();
  }

  const section = await dbGetActiveHomePageSectionWithTagsBySlug(slug);
  if (!section) {
    notFound();
  }

  let baseline: Product[] = [];
  if (section.tagIds.length > 0) {
    baseline = await dbListProductsForHomeSectionTags(section.tagIds, section.slug);
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
            {section.name}
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
              hideCollectionNav
            />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}
