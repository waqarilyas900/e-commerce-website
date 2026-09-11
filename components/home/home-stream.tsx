import { ProductSection, WhyShop } from "@/components/storefront";
import { ActiveWearBlock } from "@/components/home/ActiveWearBlock";
import {
  HomeCollectionsStrip,
  loadHomeCollectionTiles,
} from "@/components/home/HomeCollectionsStrip";
import { TrustRatingStrip } from "@/components/home/TrustRatingStrip";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { getHomeCalloutImages } from "@/app/lib/home-callout-images";
import { getHomeRailSections } from "@/app/lib/home-rails";
import { getCachedHomeReviewHighlights } from "@/lib/cache/home-review-highlights";
import { getCachedStoreReviewAggregate } from "@/lib/cache/store-review-aggregate";
import { RecentlyViewedSection } from "@/components/product/recently-viewed-section";

/** Skeleton for collections / callout strip under the hero. */
export function HomeFirstStripSkeleton() {
  return (
    <div className="border-b border-[#e8e8e1] bg-white" aria-busy="true" aria-label="Loading collections">
      <div className="mx-auto max-w-7xl shell-x py-8 sm:py-10">
        <div className="mx-auto mb-5 h-7 w-48 animate-pulse rounded bg-neutral-100 sm:mb-6" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-lg bg-neutral-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for product rails + reviews while they stream in. */
export function HomeDeferredSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading products">
      {Array.from({ length: 2 }).map((_, section) => (
        <section
          key={section}
          className="border-b border-[#e8e8e1] bg-white py-8 sm:py-10"
        >
          <div className="mx-auto max-w-7xl shell-x">
            <div className="mb-4 h-7 w-56 animate-pulse rounded bg-neutral-100 sm:mb-5" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} variant="rail" showAddToCart={false} />
              ))}
            </div>
          </div>
        </section>
      ))}
      <div className="border-t border-neutral-200 bg-white py-10">
        <div className="mx-auto max-w-[1200px] shell-x">
          <div className="h-48 animate-pulse rounded bg-neutral-100 md:h-64" />
        </div>
      </div>
    </div>
  );
}

/**
 * First visual strip after hero — collections + callouts.
 * Streams independently so the hero can paint without waiting on rails/reviews.
 */
export async function HomeFirstStrip() {
  const [collectionTiles, calloutImages] = await Promise.all([
    loadHomeCollectionTiles(),
    getHomeCalloutImages(),
  ]);

  return (
    <>
      <ActiveWearBlock calloutImages={calloutImages} />
      <HomeCollectionsStrip tiles={collectionTiles} />
    </>
  );
}

/**
 * Product rails + social proof — deferred after hero + first strip.
 */
export async function HomeDeferredSections() {
  const [railSections, storeReviews, reviewHighlights] = await Promise.all([
    getHomeRailSections(),
    getCachedStoreReviewAggregate(),
    getCachedHomeReviewHighlights(),
  ]);

  return (
    <>
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
      <RecentlyViewedSection className="mx-auto max-w-7xl shell-x" />
      <WhyShop />
      <TrustRatingStrip aggregate={storeReviews} reviews={reviewHighlights} />
    </>
  );
}
