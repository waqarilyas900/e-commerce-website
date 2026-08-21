import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductPdp } from "@/components/product/product-pdp";
import { CustomerReviews } from "@/components/product/customer-reviews";
import { Footer, Header, ProductCard, TopStrip } from "@/components/storefront";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { dbListProductReviewsForPdp } from "@/app/lib/db/catalog";
import {
  findUniqueActiveProductSlugByPrefix,
  getCachedProductDetailBySlug,
  getCachedProductsByCollectionSlug,
} from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadProductSeoExtras,
  loadSeoOverrideForSubject,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
  stripHtml,
  type ProductOpenGraphExtras,
} from "@/lib/seo";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import {
  JsonLd,
  applyJsonLdOverrides,
  breadcrumbJsonLd,
  faqPageJsonLd,
  productJsonLd,
  storeFaqItems,
} from "@/lib/seo/jsonld";
import { PageBreadcrumbs } from "@/components/seo/page-breadcrumbs";
import { StoreFaqSection } from "@/components/seo/store-faq";

/**
 * Compute Facebook product OG extension fields from a `ProductDetail`:
 * `product:price:amount`, `product:price:currency`, `product:availability`,
 * `product:condition`, `product:retailer_item_id`, `product:brand`. These are
 * the fields Facebook Catalog and Pinterest Rich Pins read.
 */
function computeProductOgExtras(args: {
  variants: Array<{ price: number; quantity_on_hand?: number; quantity_reserved?: number; sku?: string }>;
  identity: { currency: string; storeName: string; siteTitle: string; organizationLegalName: string };
  brandName?: string;
  gtin?: string;
}): ProductOpenGraphExtras | null {
  const { variants, identity } = args;
  if (!variants.length) return null;

  let low = Infinity;
  let anyAvailable = false;
  let preferredSku = "";
  for (const v of variants) {
    const p = Number(v.price);
    if (Number.isFinite(p) && p < low) {
      low = p;
      preferredSku = v.sku || preferredSku;
    }
    const stock = Math.max(0, (v.quantity_on_hand ?? 0) - (v.quantity_reserved ?? 0));
    if (stock > 0) anyAvailable = true;
  }
  if (!Number.isFinite(low)) return null;

  const brand =
    (args.brandName ?? "").trim() ||
    identity.organizationLegalName.trim() ||
    identity.storeName.trim() ||
    identity.siteTitle.trim() ||
    undefined;

  return {
    priceAmount: low,
    priceCurrency: identity.currency || "PKR",
    availability: anyAvailable ? "instock" : "oos",
    condition: "new",
    retailerItemId: preferredSku || undefined,
    brand,
    gtin: args.gtin?.trim() || undefined,
  };
}

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
    getCachedProductDetailBySlug(slug),
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

  const [override, seoExtras] = await Promise.all([
    loadSeoOverrideForSubject("product", detail.product.id, identity.locale),
    loadProductSeoExtras(detail.product.id),
  ]);
  const description =
    stripHtml(detail.product.short_description) ||
    stripHtml(detail.product.description);
  const images = detail.assets
    .filter((a) => a.kind === "image" && a.url)
    .slice(0, 4)
    .map((a) => ({ url: a.url, alt: a.alt_text || detail.product.name }));

  const productExtras = computeProductOgExtras({
    variants: detail.variants,
    identity,
    brandName: seoExtras.brandName,
    gtin: seoExtras.gtin,
  });

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
      productExtras,
    },
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug ?? "").trim();

  if (!hasCatalogDb() || !slug) {
    notFound();
  }

  let detail = await getCachedProductDetailBySlug(slug);
  if (!detail) {
    const recovered = await findUniqueActiveProductSlugByPrefix(slug);
    if (recovered && recovered !== slug) {
      permanentRedirect(`/products/${recovered}`);
    }
    notFound();
  }
  if (detail.variants.length === 0) {
    notFound();
  }

  // Critical-path data (above-the-fold buy box + structured data) — block on
  // these. Related products and reviews are streamed in via Suspense below
  // so the user sees the buy box before those slower joins finish.
  const [identity, seoExtras] = await Promise.all([
    loadSiteIdentity(),
    loadProductSeoExtras(detail.product.id),
  ]);
  const seoOverride = await loadSeoOverrideForSubject("product", detail.product.id, identity.locale);
  const hasRealCollection =
    detail.collectionSlug.trim() !== "" &&
    detail.collectionSlug.toLowerCase() !== "uncategorized";

  const canonical = resolveSeoCanonicalOverride(
    seoOverride?.canonicalUrl,
    canonicalUrlFor(`/products/${slug}`),
  );
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
    shoppingExtras: seoExtras,
    optionDefinitions: detail.optionDefinitions,
    category: detail.collectionName || detail.collectionSlug,
  });
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    ...(hasRealCollection
      ? [
          {
            name: detail.collectionName || detail.collectionSlug,
            url: `/collections/${detail.collectionSlug}`,
          },
        ]
      : []),
    { name: detail.product.name, url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = `${canonical}#breadcrumb`;
  const productLdFinal = applyJsonLdOverrides(
    { ...productLd, breadcrumb: { "@id": `${canonical}#breadcrumb` } },
    seoOverride?.jsonLdOverrides,
  );
  const faqItems = storeFaqItems(detail.product.name);
  const faqLd = faqPageJsonLd({ url: canonical, items: faqItems });

  return (
    <>
      <JsonLd id="ld-product" data={productLdFinal} />
      <JsonLd id="ld-breadcrumb" data={crumbs} />
      {faqLd ? <JsonLd id="ld-faq" data={faqLd} /> : null}
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-7xl shell-x py-5 sm:py-6"
      >
        <PageBreadcrumbs
          items={[
            { name: "Home", href: "/" },
            ...(hasRealCollection
              ? [
                  {
                    name: detail.collectionName || detail.collectionSlug,
                    href: `/collections/${detail.collectionSlug}`,
                  },
                ]
              : []),
            { name: detail.product.name },
          ]}
        />
        <ProductPdp
          key={detail.product.id}
          product={detail.product}
          productSlug={slug}
          optionDefinitions={detail.optionDefinitions}
          collectionLabel={
            hasRealCollection
              ? detail.collectionName || detail.collectionSlug
              : ""
          }
          collectionHref={
            hasRealCollection ? `/collections/${detail.collectionSlug}` : ""
          }
          variants={detail.variants}
          assets={detail.assets}
          colorById={detail.colorById}
          safeDescriptionHtml={sanitizeRichHtml(detail.product.description)}
        />
        <StoreFaqSection items={faqItems} />
        <Suspense fallback={<RelatedProductsFallback />}>
          {/* Streamed in after the buy box renders. The query joins
              product_collections → product_variants → inventory and runs ~150-300ms
              on cold cache; with above-the-fold streaming the user can interact
              with the PDP before this section paints. */}
          <RelatedProductsSection
            collectionSlug={detail.collectionSlug}
            collectionName={detail.collectionName || detail.collectionSlug}
            currentSlug={slug}
          />
        </Suspense>
        <Suspense fallback={<ReviewsFallback />}>
          <ProductReviewsSection
            productId={detail.product.id}
            rating={Number(detail.product.rating ?? 0)}
            reviewsCount={Number(detail.product.reviews_count ?? 0)}
            productTags={detail.product.tags}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

// ---- Streamed sub-sections (rendered behind <Suspense>) ----

async function RelatedProductsSection({
  collectionSlug,
  collectionName,
  currentSlug,
}: {
  collectionSlug: string;
  collectionName: string;
  currentSlug: string;
}) {
  if (!collectionSlug || collectionSlug.toLowerCase() === "uncategorized") {
    return null;
  }
  const relatedDb = await getCachedProductsByCollectionSlug(collectionSlug);
  const related = relatedDb.filter((item) => item.slug !== currentSlug).slice(0, 8);
  if (related.length === 0) return null;
  const viewAllHref = `/collections/${collectionSlug}`;
  const heading = collectionName?.trim() || "Related products";
  return (
    <section className="mt-8 sm:mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          More from {heading}
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
        >
          View all {heading}
        </Link>
      </div>
      <div className="mt-3 sm:mt-4 md:hidden">
        <ul
          className="-mx-2 flex list-none items-stretch gap-1 overflow-x-auto scroll-px-2 scroll-smooth px-2 pb-2 pt-1 snap-x snap-mandatory sm:mx-0 sm:gap-1.5 sm:px-0 sm:scroll-px-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {related.map((item, idx) => (
            <li
              key={item.id}
              className="w-[calc((100vw-1.25rem)/1.5)] min-w-[172px] max-w-[232px] shrink-0 snap-start snap-always flex flex-col sm:w-[200px] sm:max-w-none"
            >
              <div className="flex h-full min-h-0 flex-1 flex-col">
                <ProductCard
                  product={item}
                  showAddToCart={false}
                  rail
                  clampTitle
                  revealDelay={Math.min(idx * 0.08, 0.36)}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden md:grid md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
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
  );
}

function RelatedProductsFallback() {
  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="text-2xl font-semibold tracking-tight">Related products</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <ProductCardSkeleton key={idx} />
        ))}
      </div>
    </section>
  );
}

async function ProductReviewsSection({
  productId,
  rating,
  reviewsCount,
  productTags,
}: {
  productId: string;
  rating: number;
  reviewsCount: number;
  productTags?: string[] | null;
}) {
  const initialReviews = await dbListProductReviewsForPdp(productId);
  const breakdownTag = (productTags ?? []).find((t) =>
    String(t).startsWith("rating_breakdown:"),
  );
  let ratingBreakdown: number[] | null = null;
  if (breakdownTag) {
    const parts = String(breakdownTag)
      .slice("rating_breakdown:".length)
      .split(",")
      .map((x) => Number(x.trim()));
    if (parts.length === 5 && parts.every((n) => Number.isFinite(n))) {
      ratingBreakdown = parts;
    }
  }
  return (
    <CustomerReviews
      productId={productId}
      rating={rating}
      reviewsCount={reviewsCount}
      initialReviews={initialReviews}
      ratingBreakdown={ratingBreakdown}
    />
  );
}

function ReviewsFallback() {
  return (
    <section className="mt-10">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800/60" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-zinc-200/70 bg-white p-4 dark:border-zinc-800/70 dark:bg-zinc-900"
          >
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/70" />
            <div className="mt-2 h-3 w-full animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/60" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </section>
  );
}
