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
import { TrustRatingStrip } from "@/components/home/TrustRatingStrip";
import { getHomeRailSections } from "@/app/lib/home-rails";

export default async function Home() {
  const railSections = await getHomeRailSections();

  return (
    <>
      <SkipToContent />
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content bg-white">
        <HeroSlideshow />
        <MissionStrip />
        <ActiveWearBlock />
        {railSections.map((rail) => (
          <ProductSection
            key={rail.title}
            title={rail.title}
            items={rail.items}
            viewAllHref={rail.viewAllHref}
            showAddToCart={false}
            layout="rail"
            totalProductCount={rail.totalProductCount}
          />
        ))}
        <WhyShop />
        <TrustRatingStrip />
      </main>
      <Footer />
    </>
  );
}
