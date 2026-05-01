import Link from "next/link";
import type { StoreReviewAggregate } from "@/lib/cache/store-review-aggregate";

/** Dark teal accent aligned with reference trust strip (~ verified ecommerce badges). */
const accent = "text-[#0a5d52]";
const accentMuted = "text-[#0a5d52]/85";

type Props = {
  aggregate: StoreReviewAggregate;
};

function TrustStars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const starPath =
    "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

  return (
    <span
      className={`inline-flex items-center gap-px ${accent}`}
      aria-hidden
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = v >= i;
        const half = !filled && v >= i - 0.5;
        const gradId = `trust-star-half-${i}`;
        return (
          <svg
            key={i}
            width={17}
            height={17}
            viewBox="0 0 24 24"
            className="shrink-0"
            fill="currentColor"
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={gradId} x1="0" x2="100%" y1="0" y2="0">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="#cbd5e1" />
                  </linearGradient>
                </defs>
                <path fill={`url(#${gradId})`} d={starPath} />
              </>
            ) : (
              <path fill={filled ? "currentColor" : "#cbd5e1"} d={starPath} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

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
            className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-center ${accent}`}
          >
            <VerifiedBadge />
            <span className="text-2xl font-semibold leading-none tracking-tight sm:text-[1.65rem]">
              {ratingLabel}
            </span>
            <TrustStars value={averageRating} />
            <span className="select-none text-neutral-300" aria-hidden>
              |
            </span>
            <Link
              href="/collections"
              title="Browse our catalog"
              className={`text-sm font-normal underline decoration-[#0a5d52]/35 underline-offset-[5px] transition hover:decoration-[#0a5d52] sm:text-[15px] ${accentMuted}`}
            >
              {sentence}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
