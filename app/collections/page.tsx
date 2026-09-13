import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  HomeCollectionsStrip,
  loadHomeCollectionTiles,
} from "@/components/home/HomeCollectionsStrip";
import { getCachedAllActiveProductTiles } from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { notFound } from "next/navigation";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
} from "@/lib/seo";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/canonical";
import { PageBreadcrumbs } from "@/components/seo/page-breadcrumbs";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/collections", identity.locale);
  return buildPageMetadata({
    pathname: "/collections",
    identity,
    override,
    defaults: {
      title: "Shop All Collections in Pakistan",
      description:
        identity.siteDescription ||
        `Browse drinkware, kitchen tools, beauty gadgets and home essentials across the full catalog at ${identity.storeName || identity.siteTitle || "our shop"}.`,
    },
  });
}

export default async function CollectionsPage() {
  if (!hasCatalogDb()) {
    notFound();
  }

  const [tiles, allProducts, identity] = await Promise.all([
    loadHomeCollectionTiles(),
    getCachedAllActiveProductTiles(),
    loadSiteIdentity(),
  ]);
  const override = await loadSeoOverrideForRoute("/collections", identity.locale);
  const heading = "Shop collections";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/collections"),
  );
  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Collections", url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;

  const hubLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collections-hub`,
    url: canonical,
    name: heading,
    description:
      override?.description?.trim() ||
      identity.siteDescription ||
      `Browse collections at ${identity.storeName || identity.siteTitle || "our shop"}.`,
    breadcrumb: { "@id": breadcrumbId },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tiles.length,
      itemListElement: tiles.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(t.href),
        name: t.name,
      })),
    },
  };

  return (
    <>
      <JsonLd id="ld-collections-hub" data={hubLd} />
      <JsonLd id="ld-breadcrumb" data={crumbs} />
      <main id="MainContent" className="main-content">
        <div className="mx-auto max-w-7xl shell-x pt-4 sm:pt-6">
          <PageBreadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections" }]} />
        </div>

        {/* Same marquee banners as homepage Shop collections */}
        <HomeCollectionsStrip
          tiles={tiles}
          headingId="collections-hub-heading"
          headingAs="h1"
          showViewAll={false}
        />

        {/* Full catalog — every product, same as before */}
        <ScrollReveal className="mx-auto max-w-7xl shell-x py-8 sm:py-10">
          <section>
            <h2 className="text-center text-[1.50rem] font-semibold tracking-tight sm:text-2xl">
              All products
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-1 sm:mt-6 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
              {allProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAddToCart={false}
                  revealDelay={Math.min(idx * 0.08, 0.36)}
                  clampTitle
                />
              ))}
            </div>
          </section>
        </ScrollReveal>
      </main>
    </>
  );
}
