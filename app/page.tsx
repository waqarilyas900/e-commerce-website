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

export default async function Home() {
  const [railSections, homeMarketing] = await Promise.all([
    getHomeRailSections(),
    getHomeMarketingData(),
  ]);

  return (
    <>
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
      </main>
      <Footer />
    </>
  );
}
