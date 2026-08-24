import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/storefront";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  getCachedAllActiveProductsForCards,
  getCachedListCollections,
} from "@/lib/cache/catalog-data";
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
import {
  collectionDisplayName,
  normalizeCollectionSlug,
} from "@/lib/catalog/collection-nav";

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

  const [collections, allProducts, identity] = await Promise.all([
    getCachedListCollections(),
    getCachedAllActiveProductsForCards(),
    loadSiteIdentity(),
  ]);
  const override = await loadSeoOverrideForRoute("/collections", identity.locale);
  const heading = "Shop All Collections";
  const intro =
    "Browse drinkware, kitchen tools, beauty gadgets, appliances and more — curated home essentials.";
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

  const collectionCards = collections.map((c) => {
    const slug = normalizeCollectionSlug(c.slug);
    return {
      ...c,
      slug,
      displayName: collectionDisplayName(slug, c.name),
    };
  });

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
      numberOfItems: collectionCards.length,
      itemListElement: collectionCards.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/collections/${c.slug}`),
        name: c.displayName,
      })),
    },
  };

  return (
    <>
      <JsonLd id="ld-collections-hub" data={hubLd} />
      <JsonLd id="ld-breadcrumb" data={crumbs} />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      >
        <PageBreadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections" }]} />
        <ScrollReveal>
          <section>
            <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600 sm:text-base">{intro}</p>
            {collectionCards.length > 0 ? (
              <ul className="mt-5 grid list-none grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
                {collectionCards.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/collections/${c.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 transition hover:border-neutral-400 hover:bg-white"
                    >
                      {c.hero_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.hero_image}
                          alt={`${c.displayName} collection`}
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="aspect-[4/3] w-full bg-neutral-200" />
                      )}
                      <span className="px-3 py-2.5 text-sm font-semibold text-neutral-900 group-hover:underline underline-offset-4">
                        {c.displayName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mt-10 sm:mt-12">
            <h2 className="text-2xl font-semibold tracking-tight">All products</h2>
            <div className="mt-3 grid grid-cols-2 gap-1 sm:mt-4 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
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
