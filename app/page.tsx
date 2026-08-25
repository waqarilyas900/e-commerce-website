import type { Metadata } from "next";
import { getImageProps } from "next/image";
import {
  ProductSection,
  TopStrip,
  WhyShop,
} from "@/components/storefront";
import { ActiveWearBlock } from "@/components/home/ActiveWearBlock";
import { HeroBanner } from "@/components/home/HeroBanner";
import {
  HomeCollectionsStrip,
  loadHomeCollectionTiles,
} from "@/components/home/HomeCollectionsStrip";
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
} from "@/lib/seo";
import { JsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { HomeSectionTitle } from "@/components/ui/home-section-title";
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

/**
 * Await catalog sections with the rest of the home payload (no Suspense).
 * Warm `unstable_cache` keeps this fast; the first paint includes collections
 * + rails so grey skeletons never flash between shell and content.
 */
export default async function Home() {
  const [homeMarketing, storeReviews, identityBundle, collectionTiles, railSections] =
    await Promise.all([
      getHomeMarketingData(),
      getCachedStoreReviewAggregate(),
      loadSiteIdentity().then(async (identity) => ({
        identity,
        override: await loadSeoOverrideForRoute("/", identity.locale),
      })),
      loadHomeCollectionTiles(),
      getHomeRailSections(),
    ]);
  const { identity, override } = identityBundle;
  const firstHeroImage = homeMarketing.slides[0]?.image ?? "";
  const canonical = resolveSeoCanonicalOverride(
    override?.canonicalUrl,
    canonicalUrlFor("/"),
  );
  const homeDisplayTitle = "Everyday essentials, thoughtfully curated";
  const homeDisplayDescription =
    "Browse drinkware, kitchen tools, beauty gadgets and home essentials — thoughtfully picked for comfort, convenience, and style, ready to make everyday living a little easier.";
  const homeLd = webPageJsonLd({
    url: canonical,
    name:
      override?.title?.trim() ||
      identity.storeName ||
      identity.siteTitle ||
      homeDisplayTitle,
    description:
      override?.description?.trim() ||
      identity.siteDescription ||
      homeDisplayDescription,
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
      <main id="MainContent" className="main-content bg-white">
        {homeMarketing.slides.length > 0 ? (
          <HeroBanner slides={homeMarketing.slides} />
        ) : null}
        <TopStrip />
        <section className="border-b border-[#e8e8e1] bg-white">
          <div className="mx-auto max-w-7xl shell-x py-4 text-center sm:py-5">
            <HomeSectionTitle as="h1">{homeDisplayTitle}</HomeSectionTitle>
            <p className="mx-auto mt-1.5 max-w-2xl text-sm text-neutral-600 sm:text-[15px]">
              {homeDisplayDescription}
            </p>
          </div>
        </section>
        {homeMarketing.missionParagraph ? (
          <MissionStrip missionHtml={homeMarketing.missionParagraph} />
        ) : null}
        <ActiveWearBlock />
        <HomeCollectionsStrip tiles={collectionTiles} />
        {railSections.map((rail) => (
          <ProductSection
            key={rail.viewAllHref}
            title={rail.title}
            items={rail.items}
            viewAllHref={rail.viewAllHref}
            showAddToCart={false}
            layout="rail"
            totalProductCount={rail.totalProductCount}
          />
        ))}
        <WhyShop />
        <TrustRatingStrip aggregate={storeReviews} />
      </main>
    </>
  );
}
