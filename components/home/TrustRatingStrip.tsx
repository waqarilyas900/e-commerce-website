import Link from "next/link";
import type { StoreReviewAggregate } from "@/lib/cache/store-review-aggregate";
import { StarRating } from "@/components/ui/star-rating";

/** Body text matches storefront system (`text-neutral-900` elsewhere in grids/PDP). */
const bodyText = "text-neutral-900";

type Props = {
  aggregate: StoreReviewAggregate;
};

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" className="fill-[#0a5d52]" />
        <path
          d="M8 12.5l2.2 2.2 5.8-5.8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Homepage-only trust row: verified glyph + numeric rating + stars + review count link.
 * Renders above the footer even when the store average is 0.0 and review count is 0.
 */
export function TrustRatingStrip({ aggregate }: Props) {
  const { averageRating, totalReviews } = aggregate;
  const ratingLabel = averageRating.toFixed(1);
  const reviewsFmt = new Intl.NumberFormat("en-US").format(totalReviews);
  const reviewsWord = totalReviews === 1 ? "review" : "reviews";
  const sentence = `${ratingLabel} out of 5 stars based on ${reviewsFmt} ${reviewsWord}`;

  return (
    <section
      className="border-t border-neutral-200 bg-white py-7 sm:py-8"
      aria-labelledby="home-trust-rating-heading"
    >
      <div className="mx-auto max-w-7xl shell-x">
        <div className="flex flex-col items-center justify-center gap-2">
          <h2 id="home-trust-rating-heading" className="sr-only">
            Customer ratings
          </h2>
          <div
            className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-center ${bodyText}`}
          >
            <VerifiedBadge />
            <span className="text-2xl font-semibold leading-none tracking-tight sm:text-[1.65rem]">
              {ratingLabel}
            </span>
            <StarRating value={averageRating} />
            <span className="select-none text-neutral-300" aria-hidden>
              |
            </span>
            <Link
              href="/collections"
              title="Browse our catalog"
              className="text-sm font-normal text-neutral-900 underline decoration-neutral-400 underline-offset-[5px] transition hover:decoration-neutral-900 sm:text-[15px]"
            >
              {sentence}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
