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
        `Shop at ${identity.storeName || identity.siteTitle || "our store"}.`,
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
    <section className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 md:py-10 lg:px-8">
      <div className="h-7 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-md border border-neutral-200 bg-white">
            <div className="aspect-4/5 w-full animate-pulse bg-neutral-200" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
