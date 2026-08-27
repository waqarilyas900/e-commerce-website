import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  CollectionImageTiles,
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
      title: "Shop Collections",
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
  const intro =
    "Drinkware, kitchen, beauty & home for everyday Pakistan.";
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
    description: intro,
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

        <section
          aria-labelledby="collections-hub-heading"
          className="relative overflow-hidden border-b border-[#e8e8e1] bg-[linear-gradient(180deg,#f7f5f2_0%,#ffffff_42%,#ffffff_100%)]"
        >
          <div
            className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-[#E0703A]/[0.07] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[#1c1d1d]/[0.04] blur-3xl"
            aria-hidden
          />

          <ScrollReveal className="relative mx-auto max-w-7xl shell-x pb-8 pt-4 sm:pb-12 sm:pt-6">
            <h1 id="collections-hub-heading" className="sr-only">
              {heading}
            </h1>
            <CollectionImageTiles tiles={tiles} />
          </ScrollReveal>
        </section>

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
