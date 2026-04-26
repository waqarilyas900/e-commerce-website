import { Suspense } from "react";
import type { Metadata } from "next";
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

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams != null ? await searchParams : {};
  const pathname = `/s/${slug}`;

  if (!hasCatalogDb()) {
    const identity = await loadSiteIdentity();
    return buildPageMetadata({
      pathname,
      searchParams: sp,
      identity,
      override: null,
      defaults: { title: "Section", description: identity.siteDescription, forceNoindex: true },
    });
  }

  const [section, identity] = await Promise.all([
    dbGetActiveHomePageSectionWithTagsBySlug(slug),
    loadSiteIdentity(),
  ]);
  if (!section) {
    return buildPageMetadata({
      pathname,
      searchParams: sp,
      identity,
      override: null,
      defaults: { title: "Section not found", description: "", forceNoindex: true },
    });
  }
  const override = await loadSeoOverrideForSubject("home_section", section.id, identity.locale);
  return buildPageMetadata({
    pathname,
    searchParams: sp,
    identity,
    override,
    defaults: {
      title: section.name,
      description: `${section.name} from ${identity.storeName || identity.siteTitle || "our store"}.`,
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
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-md bg-neutral-100" />
        ))}
      </div>
      <div className="hidden gap-2 lg:grid lg:grid-cols-4">
        <div className="grid min-w-0 grid-cols-2 gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:col-span-4 lg:grid-cols-4 lg:gap-2">
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

  const canonical = canonicalUrlFor(`/s/${slug}`);
  const collectionLd = collectionJsonLd({
    url: canonical,
    name: section.name,
    products: baseline,
  });
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: section.name, url: `/s/${slug}` },
  ]);

  return (
    <>
      <JsonLd id="ld-section" data={collectionLd} />
      <JsonLd id="ld-breadcrumb-section" data={crumbs} />
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6">
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
