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
      <div className="mx-auto max-w-7xl shell-x pb-2.5 pt-4 sm:pb-3 sm:pt-5">
        <div className="mb-0 h-6 w-40 animate-pulse rounded bg-neutral-100" />
      </div>
      <div className="flex gap-2.5 overflow-hidden pb-4 md:gap-3.5 sm:pb-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="size-[112px] shrink-0 animate-pulse rounded-2xl bg-neutral-100 sm:size-[140px] md:size-[168px] lg:size-[188px]"
          />
        ))}
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
          className="border-b border-[#e8e8e1] bg-neutral-100/80 py-3.5 sm:py-6"
        >
          <div className="mx-auto max-w-7xl shell-x">
            <div className="mb-3 h-6 w-48 animate-pulse rounded bg-neutral-100 sm:mb-5 sm:h-7 sm:w-56" />
            <div className="flex gap-1 overflow-hidden md:hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[calc((100vw-1rem)/2.15)] max-w-[152px] shrink-0 animate-pulse"
                >
                  <div className="aspect-square rounded-md bg-neutral-200/80" />
                  <div className="mt-1.5 h-3 w-4/5 rounded bg-neutral-100" />
                  <div className="mt-1 h-3 w-1/2 rounded bg-neutral-100" />
                </div>
              ))}
            </div>
            <div className="hidden gap-2 md:grid md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
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
      <RecentlyViewedSection className="mx-auto max-w-7xl shell-x" />
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
      <TrustRatingStrip aggregate={storeReviews} reviews={reviewHighlights} />
    </>
  );
}
