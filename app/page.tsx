import type { Metadata } from "next";
import { Suspense } from "react";
import { getImageProps } from "next/image";
import { TopStrip } from "@/components/storefront";
import { HeroBanner } from "@/components/home/HeroBanner";
import { MissionStrip } from "@/components/home/MissionStrip";
import { SkipToContent } from "@/components/home/SkipToContent";
import {
  HomeDeferredSections,
  HomeDeferredSkeleton,
  HomeFirstStrip,
  HomeFirstStripSkeleton,
} from "@/components/home/home-stream";
import { getHomeMarketingData } from "@/app/lib/home-marketing";
import {
  buildPageMetadata,
  canonicalUrlFor,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
  resolveSeoCanonicalOverride,
  HOME_METADATA_TITLE,
} from "@/lib/seo";
import { JsonLd, webPageJsonLd } from "@/lib/seo/jsonld";
import { HomeSectionTitle } from "@/components/ui/home-section-title";
import { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES } from "@/lib/images/hero";
import { HomeStickyProductVideo } from "@/components/home/HomeStickyProductVideo";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await loadSiteIdentity();
  const override = await loadSeoOverrideForRoute("/", identity.locale);
  return buildPageMetadata({
    pathname: "/",
    identity,
    override,
    defaults: {
      title: HOME_METADATA_TITLE,
      description:
        identity.siteDescription ||
        `Shop home, kitchen and beauty essentials from ${identity.storeName || identity.siteTitle || "our shop"} with delivery across Pakistan.`,
    },
  });
}

/**
 * Stream the homepage: hero (+ title) paints as soon as marketing is ready.
 * Collections strip and product rails/reviews stream in behind Suspense skeletons
 * so users see content quickly instead of waiting on the slowest home query.
 */
export default async function Home() {
  const [homeMarketing, identityBundle] = await Promise.all([
    getHomeMarketingData(),
    loadSiteIdentity().then(async (identity) => ({
      identity,
      override: await loadSeoOverrideForRoute("/", identity.locale),
    })),
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

        <Suspense fallback={<HomeFirstStripSkeleton />}>
          <HomeFirstStrip />
        </Suspense>

        <Suspense fallback={<HomeDeferredSkeleton />}>
          <HomeDeferredSections />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <HomeStickyProductVideo />
      </Suspense>
    </>
  );
}
