import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomerReviewsView } from "@/components/reviews/customer-reviews-view";
import { PageBreadcrumbs } from "@/components/seo/page-breadcrumbs";
import {
  getCachedStoreReviewAggregate,
} from "@/lib/cache/store-review-aggregate";
import {
  DEFAULT_PAGE_SIZE,
  getCachedReviewMediaGallery,
  getCachedStoreReviewBreakdown,
  getCachedStoreReviewsPage,
  type StoreReviewSort,
} from "@/lib/cache/store-reviews-page";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
} from "@/lib/seo";
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/jsonld";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

function parseSort(raw: string | undefined): StoreReviewSort {
  if (raw === "oldest" || raw === "highest" || raw === "lowest" || raw === "newest") {
    return raw;
  }
  return "newest";
}

function parseStar(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/customer-reviews", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  return buildPageMetadata({
    pathname: "/customer-reviews",
    identity,
    override,
    defaults: {
      title: "Customer Reviews",
      description: `Read verified customer reviews for ${storeName} — real ratings from shoppers across Pakistan.`,
    },
  });
}

export default async function CustomerReviewsPage({ searchParams }: Props) {
  const sp = searchParams != null ? await searchParams : {};
  const sort = parseSort(firstParam(sp, "sort"));
  const star = parseStar(firstParam(sp, "star"));
  const page = Math.max(1, Number(firstParam(sp, "page") || 1) || 1);

  const [identity, aggregate, breakdown, list, media] = await Promise.all([
    loadSiteIdentity(),
    getCachedStoreReviewAggregate(),
    getCachedStoreReviewBreakdown(),
    getCachedStoreReviewsPage({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      sort,
      star,
    }),
    getCachedReviewMediaGallery(),
  ]);
  const override = await loadSeoOverrideForRoute("/customer-reviews", identity.locale);
  const storeName = identity.storeName || identity.siteTitle || "SimpleCart Store";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/customer-reviews", sp),
  );
  const title = override?.title?.trim() || "Customer Reviews";
  const description =
    override?.description?.trim() ||
    `Read verified customer reviews for ${storeName} — real ratings from shoppers across Pakistan.`;

  const breadcrumbId = `${canonical}#breadcrumb`;
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Customer Reviews", url: canonical },
  ]);
  (crumbs as { "@id"?: string })["@id"] = breadcrumbId;
  const pageLd = webPageJsonLd({
    url: canonical,
    name: title,
    description,
    identity,
    breadcrumbId,
  });

  return (
    <>
      <JsonLd id="ld-customer-reviews" data={pageLd} />
      <JsonLd id="ld-customer-reviews-breadcrumb" data={crumbs} />
      <main
        id="MainContent"
        className="main-content bg-white pb-12 pt-4 sm:pb-16 sm:pt-6 md:pb-20 md:pt-8"
      >
        <div className="mx-auto max-w-7xl shell-x">
          <PageBreadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Customer Reviews" },
            ]}
          />

          <header className="mt-4 text-center sm:mt-6">
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-neutral-950 sm:text-4xl md:text-5xl">
              Customer Reviews
            </h1>
          </header>

          <div className="mt-10">
            <Suspense
              fallback={
                <p className="py-12 text-center text-sm text-neutral-600">Loading reviews…</p>
              }
            >
              <CustomerReviewsView
                aggregate={aggregate}
                breakdown={breakdown}
                media={media}
                reviews={list.reviews}
                total={list.total}
                page={list.page}
                pageCount={list.pageCount}
                sort={sort}
                starFilter={star}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
