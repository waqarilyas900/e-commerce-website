import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getCachedCollectionBySlug,
  getCachedListCollections,
  getCachedProductsByCollectionSlug,
} from "@/lib/cache/catalog-data";
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
  resolveSeoCanonicalOverride,
  collectionMetadataTitle,
} from "@/lib/seo";
import {
  JsonLd,
  applyJsonLdOverrides,
  breadcrumbJsonLd,
  collectionFaqItems,
  collectionJsonLd,
  faqPageJsonLd,
} from "@/lib/seo/jsonld";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { PageBreadcrumbs } from "@/components/seo/page-breadcrumbs";
import { StoreFaqSection } from "@/components/seo/store-faq";
import { RelatedCollections } from "@/components/seo/related-collections";
import { CollectionSeoContent } from "@/components/collections/collection-seo-content";
import {
  collectionDisplayName,
  normalizeCollectionSlug,
} from "@/lib/catalog/collection-nav";

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
      <div className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeCollectionSlug(rawSlug);
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
    getCachedCollectionBySlug(slug),
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

  const override = await loadSeoOverrideForSubject("collection", collection.id, identity.locale);
  const displayName = collectionDisplayName(slug, collection.name);

  return buildPageMetadata({
    pathname,
    searchParams: sp,
    identity,
    override,
    defaults: {
      title: collectionMetadataTitle(slug, displayName),
      description: collection.description,
      images: collection.hero_image
        ? [{ url: collection.hero_image, alt: displayName }]
        : [],
    },
  });
}

export default async function CollectionDetailsPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const slug = normalizeCollectionSlug(rawSlug);
  const sp = searchParams != null ? await searchParams : {};

  if (slug !== rawSlug.trim()) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (Array.isArray(value)) {
        for (const v of value) qs.append(key, v);
      } else if (value != null) {
        qs.set(key, value);
      }
    }
    const q = qs.toString();
    permanentRedirect(q ? `/collections/${slug}?${q}` : `/collections/${slug}`);
  }

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

  const dbCol = await getCachedCollectionBySlug(slug);
  if (dbCol) {
    collection = {
      slug: dbCol.slug,
      name: dbCol.name,
      description: dbCol.description,
      heroImage: dbCol.hero_image,
    };
    baseline = await getCachedProductsByCollectionSlug(slug);
  }

  if (!collection || !dbCol) {
    notFound();
  }

  const [navLinks, identity, allCollections] = await Promise.all([
    getNavCollectionLinks(),
    loadSiteIdentity(),
    getCachedListCollections(),
  ]);
  const seoOverride = await loadSeoOverrideForSubject("collection", dbCol.id, identity.locale);
  const displayName = collectionDisplayName(collection.slug, collection.name);
  const featuredIndex = buildFeaturedIndex(baseline);
  const maxCeil = maxPriceCeiling(baseline);

  let list = filterCollectionProducts(
    baseline,
    parsed.availability,
    parsed.priceMin,
    parsed.priceMax,
  );
  list = sortCollectionProducts(list, parsed.sort, featuredIndex);

  const relatedCollections = allCollections
    .filter((c) => c.slug !== slug && c.slug !== "sale")
    .slice(0, 5)
    .map((c) => {
      const normalized = normalizeCollectionSlug(c.slug);
      return {
        slug: normalized,
        name: collectionDisplayName(normalized, c.name),
      };
    });

  const canonical = resolveSeoCanonicalOverride(
    seoOverride?.canonicalUrl,
    canonicalUrlFor(`/collections/${slug}`, sp),
  );
  const breadcrumbId = `${canonical}#breadcrumb`;
  const collectionLd = applyJsonLdOverrides(
    collectionJsonLd({
      url: canonical,
      name: displayName,
      description: seoOverride?.description || collection.description,
      products: list,
      totalItemCount: baseline.length,
      breadcrumbId,
    }),
    seoOverride?.jsonLdOverrides,
  );
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Collections", url: "/collections" },
    { name: displayName, url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;
  const faqItems = collectionFaqItems(displayName);
  const faqLd = faqPageJsonLd({ url: canonical, items: faqItems });

  return (
    <>
      <JsonLd id="ld-collection" data={collectionLd} />
      <JsonLd id="ld-breadcrumb" data={crumbs} />
      {faqLd ? <JsonLd id="ld-faq" data={faqLd} /> : null}
      <main id="MainContent" className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6">
        <PageBreadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Collections", href: "/collections" },
            { name: displayName },
          ]}
        />
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="text-[1.50rem] font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            {displayName}
          </h1>
          {(collection.description)?.trim() ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
              {collection.description.trim()}
            </p>
          ) : null}
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
        <CollectionSeoContent slug={slug} />
        <RelatedCollections items={relatedCollections} />
        <StoreFaqSection items={faqItems} />
      </main>
    </>
  );
}
