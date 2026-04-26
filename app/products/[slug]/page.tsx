import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPdp } from "@/components/product/product-pdp";
import { CustomerReviews } from "@/components/product/customer-reviews";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import {
  dbGetProductDetailBySlug,
  dbListProductReviewsForPdp,
  dbListProductsByCollectionSlug,
} from "@/app/lib/db/catalog";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadProductSeoExtras,
  loadSeoOverrideForSubject,
  loadSiteIdentity,
  stripHtml,
} from "@/lib/seo";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import {
  JsonLd,
  breadcrumbJsonLd,
  productJsonLd,
} from "@/lib/seo/jsonld";

type Props = {
  params: Promise<{ slug: string }>;
};

const PDP_REVIEWS_ARE_SYNTHETIC = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pathname = `/products/${slug}`;

  if (!hasCatalogDb()) {
    const identity = await loadSiteIdentity();
    return buildPageMetadata({
      pathname,
      identity,
      override: null,
      defaults: {
        title: "Product",
        description: identity.siteDescription,
        forceNoindex: true,
      },
    });
  }

  const [detail, identity] = await Promise.all([
    dbGetProductDetailBySlug(slug),
    loadSiteIdentity(),
  ]);

  if (!detail) {
    return buildPageMetadata({
      pathname,
      identity,
      override: null,
      defaults: {
        title: "Product not found",
        description: identity.siteDescription,
        forceNoindex: true,
      },
    });
  }

  const override = await loadSeoOverrideForSubject("product", detail.product.id, identity.locale);
  const description =
    stripHtml(detail.product.short_description) ||
    stripHtml(detail.product.description);
  const images = detail.assets
    .filter((a) => a.kind === "image" && a.url)
    .slice(0, 4)
    .map((a) => ({ url: a.url, alt: a.alt_text || detail.product.name }));

  return buildPageMetadata({
    pathname,
    identity,
    override,
    defaults: {
      title: detail.product.name,
      description,
      images,
      keywords: detail.product.tags ?? [],
      ogType: "website",
    },
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  if (!hasCatalogDb()) {
    notFound();
  }

  const detail = await dbGetProductDetailBySlug(slug);
  if (!detail || detail.variants.length === 0) {
    notFound();
  }

  const [relatedDb, initialReviews, identity, seoExtras] = await Promise.all([
    dbListProductsByCollectionSlug(detail.collectionSlug),
    dbListProductReviewsForPdp(detail.product.id),
    loadSiteIdentity(),
    loadProductSeoExtras(detail.product.id),
  ]);
  const seoOverride = await loadSeoOverrideForSubject("product", detail.product.id, identity.locale);
  const related = relatedDb.filter((item) => item.slug !== slug).slice(0, 4);

  const canonical = canonicalUrlFor(`/products/${slug}`);
  const productLd = productJsonLd({
    product: detail.product,
    variants: detail.variants,
    assets: detail.assets,
    identity,
    url: canonical,
    brandName: seoExtras.brandName,
    gtin: seoExtras.gtin,
    mpn: seoExtras.mpn,
    reviewsAreSynthetic: PDP_REVIEWS_ARE_SYNTHETIC,
    seoOverride,
  });
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    {
      name: detail.collectionSlug,
      url: `/collections/${detail.collectionSlug}`,
    },
    { name: detail.product.name, url: `/products/${slug}` },
  ]);

  return (
    <>
      <JsonLd id="ld-product" data={productLd} />
      <JsonLd id="ld-breadcrumb" data={crumbs} />
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      >
        <ProductPdp
          key={detail.product.id}
          product={detail.product}
          productSlug={slug}
          optionDefinitions={detail.optionDefinitions}
          collectionLabel={detail.collectionSlug}
          variants={detail.variants}
          assets={detail.assets}
          colorById={detail.colorById}
          safeDescriptionHtml={sanitizeRichHtml(detail.product.description)}
        />
        <section className="mt-8 sm:mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Related products</h2>
          <div className="mt-3 grid grid-cols-2 gap-1 sm:mt-4 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
            {related.map((item, idx) => (
              <ProductCard
                key={item.id}
                product={item}
                showAddToCart={false}
                clampTitle
                revealDelay={Math.min(idx * 0.08, 0.36)}
              />
            ))}
          </div>
        </section>
        <CustomerReviews
          productId={detail.product.id}
          rating={Number(detail.product.rating ?? 0)}
          reviewsCount={Number(detail.product.reviews_count ?? 0)}
          initialReviews={initialReviews}
        />
      </main>
      <Footer />
    </>
  );
}
