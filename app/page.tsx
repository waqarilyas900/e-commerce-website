import type { Metadata } from "next";
import { Suspense } from "react";
import { getImageProps } from "next/image";
import {
  Footer,
  Header,
  ProductSection,
  TopStrip,
  WhyShop,
} from "@/components/storefront";
import { ActiveWearBlock } from "@/components/home/ActiveWearBlock";
import { HeroBanner } from "@/components/home/HeroBanner";
import { HomeCollectionsStrip } from "@/components/home/HomeCollectionsStrip";
import { MissionStrip } from "@/components/home/MissionStrip";
import { SkipToContent } from "@/components/home/SkipToContent";
import { TrustRatingStrip } from "@/components/home/TrustRatingStrip";
import { getHomeMarketingData } from "@/app/lib/home-marketing";
import { getHomeRailSections } from "@/app/lib/home-rails";
import { getCachedStoreReviewAggregate } from "@/lib/cache/store-review-aggregate";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
  seoHeadingFromMetaTitle,
} from "@/lib/seo";
import { JsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES } from "@/lib/images/hero";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/", identity.locale);
  return buildPageMetadata({
    pathname: "/",
    identity,
    override,
    defaults: {
      title: identity.siteTitle || identity.storeName || "Store",
      description:
        identity.siteDescription ||
        `Shop home, kitchen and beauty essentials from ${identity.storeName || identity.siteTitle || "our shop"} with delivery across Pakistan.`,
    },
  });
}

export default async function Home() {
  const [homeMarketing, storeReviews, identity] = await Promise.all([
    getHomeMarketingData(),
    getCachedStoreReviewAggregate(),
    loadSiteIdentity(),
  ]);
  const firstHeroImage = homeMarketing.slides[0]?.image ?? "";
  const override = await loadSeoOverrideForRoute("/", identity.locale);
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/"),
  );
  const homeName =
    override?.title?.trim() ||
    identity.siteTitle ||
    identity.storeName ||
    "Store";
  const homeDescription =
    override?.description?.trim() ||
    identity.siteDescription ||
    `Shop home, kitchen and beauty essentials from ${identity.storeName || identity.siteTitle || "our shop"} with delivery across Pakistan.`;
  const homeLd = webPageJsonLd({
    url: canonical,
    name: homeName,
    description: homeDescription,
    identity,
    primaryImageUrl: firstHeroImage || identity.defaultOgImageUrl || null,
  });

  /**
   * Preload the same optimized candidate `next/image` will paint — never the raw
   * CDN original (a 1.8MB PNG preload was starving mobile LCP).
   */
  let heroPreload: { imageSrcSet?: string; imageSizes?: string; href?: string } | null =
    null;
  if (firstHeroImage) {
    try {
      const { props } = getImageProps({
        src: firstHeroImage,
        alt: "",
        width: 1400,
        height: 583,
        sizes: HERO_IMAGE_SIZES,
        quality: HERO_IMAGE_QUALITY,
      });
      heroPreload = {
        imageSrcSet: props.srcSet,
        imageSizes: props.sizes,
        href: props.src,
      };
    } catch {
      heroPreload = null;
    }
  }

  return (
    <>
      <JsonLd id="ld-home" data={homeLd} />
      {heroPreload ? (
        <link
          rel="preload"
          as="image"
          href={heroPreload.href}
          fetchPriority="high"
          // imageSrcSet / imageSizes are valid HTMLLinkElement attrs for responsive preloads
          {...{
            imageSrcSet: heroPreload.imageSrcSet,
            imageSizes: heroPreload.imageSizes,
          }}
        />
      ) : null}
      <SkipToContent />
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content bg-white">
        {homeMarketing.slides.length > 0 ? (
          <HeroBanner slides={homeMarketing.slides} />
        ) : null}
        <section className="border-b border-[#e8e8e1] bg-white">
          <div className="mx-auto max-w-7xl shell-x py-4 text-center sm:py-5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl md:text-3xl">
              {seoHeadingFromMetaTitle(
                homeName,
                "Home Essentials Online in Pakistan",
              )}
            </h1>
            <p className="mx-auto mt-1.5 max-w-2xl text-sm text-neutral-600 sm:text-[15px]">
              {homeDescription}
            </p>
          </div>
        </section>
        {homeMarketing.missionParagraph ? (
          <MissionStrip missionHtml={homeMarketing.missionParagraph} />
        ) : null}
        <ActiveWearBlock />
        <Suspense fallback={<HomeCollectionsFallback />}>
          <HomeCollectionsStrip />
        </Suspense>
        <Suspense fallback={<HomeRailsFallback />}>
          <HomeRails />
        </Suspense>
        <WhyShop />
        <TrustRatingStrip aggregate={storeReviews} />
        <div className="mx-auto max-w-7xl shell-x pb-10 sm:pb-12">
          <StoreFaqSection items={homeFaqItems} />
        </div>
      </main>
      <Footer />
    </>
  );
}

async function HomeRails() {
  const railSections = await getHomeRailSections();
  return railSections.map((rail) => (
    <ProductSection
      key={rail.viewAllHref}
      title={rail.title}
      items={rail.items}
      viewAllHref={rail.viewAllHref}
      showAddToCart={false}
      layout="rail"
      totalProductCount={rail.totalProductCount}
    />
  ));
}

function HomeCollectionsFallback() {
  return (
    <section className="border-b border-[#e8e8e1] bg-white">
      <div className="mx-auto max-w-7xl shell-x py-8 sm:py-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
            >
              <div className="aspect-[4/3] animate-pulse bg-neutral-200" />
              <div className="h-11 animate-pulse bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeRailsFallback() {
  return (
    <section className="bg-neutral-100/80">
      <div className="mx-auto max-w-7xl shell-x py-5 sm:py-6">
        <div className="mb-4 h-7 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="grid grid-cols-2 items-stretch gap-1 sm:gap-1.5 md:grid-cols-3 md:gap-2 lg:grid-cols-4 lg:gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} showAddToCart={false} />
          ))}
        </div>
      </div>
    </section>
  );
}
