import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Footer,
  Header,
  ProductSection,
  TopStrip,
  WhyShop,
} from "@/components/storefront";
import { ActiveWearBlock } from "@/components/home/ActiveWearBlock";
import { HeroSlideshow } from "@/components/home/HeroSlideshow";
import { MissionStrip } from "@/components/home/MissionStrip";
import { SkipToContent } from "@/components/home/SkipToContent";
import { getHomeMarketingData } from "@/app/lib/home-marketing";
import { getHomeRailSections } from "@/app/lib/home-rails";
import {
  buildPageMetadata,
  loadSeoOverrideForRoute,
  loadSiteIdentity,
} from "@/lib/seo";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

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
        `Tailoring supplies, dressmaking notions, and stitching accessories from ${identity.storeName || identity.siteTitle || "our shop"}.`,
    },
  });
}

export default async function Home() {
  const homeMarketing = await getHomeMarketingData();
  const firstHeroImage = homeMarketing.slides[0]?.image ?? "";

  return (
    <>
      {/**
       * Preload the LCP hero image so the browser fetches it during HTML parsing
       * instead of waiting for React/Next/Image to mount. Trims ~200-400 ms off
       * mobile LCP. Only the first slide is the LCP candidate; the rest stay lazy.
       */}
      {firstHeroImage ? (
        <link
          rel="preload"
          as="image"
          href={firstHeroImage}
          fetchPriority="high"
        />
      ) : null}
      <SkipToContent />
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content bg-white">
        {homeMarketing.slides.length > 0 ? (
          <HeroSlideshow slides={homeMarketing.slides} />
        ) : null}
        {homeMarketing.missionParagraph ? (
          <MissionStrip missionHtml={homeMarketing.missionParagraph} />
        ) : null}
        <ActiveWearBlock />
        <Suspense fallback={<HomeRailsFallback />}>
          <HomeRails />
        </Suspense>
        <WhyShop />
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
