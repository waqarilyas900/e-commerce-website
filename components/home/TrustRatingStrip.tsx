import Link from "next/link";
import type { HomeReviewHighlight } from "@/lib/cache/home-review-highlights";
import type { StoreReviewAggregate } from "@/lib/cache/store-review-aggregate";
import { StarRating } from "@/components/ui/star-rating";

/** Rad Store accent on dark panel (same as radstore.pk reviews split). */
const ACCENT = "#f5b400";

type Props = {
  aggregate: StoreReviewAggregate;
  reviews: HomeReviewHighlight[];
};

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Homepage reviews — dark rating panel + cards.
 * Mobile: rating panel + horizontal peek of 2 reviews.
 * Desktop: rating panel + 3-col grid.
 */
export function TrustRatingStrip({ aggregate, reviews }: Props) {
  const { averageRating, totalReviews } = aggregate;
  const ratingLabel = averageRating.toFixed(1);
  const reviewsFmt = new Intl.NumberFormat("en-US").format(totalReviews);
  const visible = reviews.slice(0, 5);
  const mobilePeek = reviews.slice(0, 2);
  const moreCount = Math.max(0, totalReviews - visible.length);
  const moreFmt = new Intl.NumberFormat("en-US").format(moreCount);
  const allReviewsHref = "/customer-reviews";

  return (
    <section
      className="border-t border-neutral-200 bg-white py-8 sm:py-10 md:py-12"
      aria-labelledby="home-trust-rating-heading"
    >
      <div className="mx-auto max-w-[1200px] shell-x">
        <h2 id="home-trust-rating-heading" className="sr-only">
          Customer ratings and reviews
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(260px,360px)_minmax(0,1fr)] md:items-stretch">
          <div className="flex flex-col items-center justify-center rounded bg-[#111] px-8 py-12 text-center sm:px-8 sm:py-12">
            <p
              className="mb-4 block text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: ACCENT }}
            >
              Rated by our customers
            </p>
            <p className="mb-3.5 pr-1.5 text-[3.375rem] font-extrabold italic leading-none tracking-tight text-white">
              {ratingLabel} / 5
            </p>
            <div className="mb-3.5" style={{ color: ACCENT }}>
              <StarRating value={averageRating} size={22} labeled className="!text-[#f5b400]" />
            </div>
            <p className="mb-[22px] text-sm font-medium text-white">
              Based on {reviewsFmt} verified {totalReviews === 1 ? "review" : "reviews"}
            </p>
            <Link
              href={allReviewsHref}
              className="inline-block rounded-sm bg-white px-[26px] py-[13px] text-xs font-bold uppercase tracking-[0.12em] text-[#111] transition hover:bg-[#f5b400]"
            >
              Read All Reviews
            </Link>
          </div>

          {/* Mobile: horizontal peek */}
          {mobilePeek.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {mobilePeek.map((review) => (
                <div key={review.id} className="w-[min(280px,85vw)] shrink-0">
                  <ReviewCard review={review} />
                </div>
              ))}
              <Link
                href={allReviewsHref}
                className="flex w-[140px] shrink-0 flex-col items-center justify-center gap-1 rounded border border-[#e8e8e1] bg-[#f7f7f7] p-4 text-center transition hover:bg-[#ebebeb]"
              >
                <span className="text-sm font-bold text-[#111]">See all</span>
                <span className="text-xs text-[#555]">reviews</span>
              </Link>
            </div>
          ) : null}

          {/* Desktop grid */}
          <div className="hidden min-w-0 md:grid md:grid-cols-3 md:grid-rows-2 md:gap-4">
            {visible.length === 0 ? (
              <div className="col-span-3 flex min-h-[200px] items-center justify-center rounded border border-[#e8e8e1] bg-neutral-50 px-6 text-center text-sm text-neutral-600">
                Customer reviews will appear here as shoppers rate products.
              </div>
            ) : (
              <>
                {visible.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
                {moreCount > 0 ? (
                  <Link
                    href={allReviewsHref}
                    className="flex min-h-[200px] flex-col items-center justify-center gap-1 rounded border border-[#e8e8e1] bg-[#f7f7f7] p-5 text-center transition hover:bg-[#ebebeb]"
                  >
                    <span className="text-xl font-extrabold text-[#111]">+{moreFmt}</span>
                    <span className="text-[13px] font-semibold text-[#555]">more reviews</span>
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: HomeReviewHighlight }) {
  const dateLabel = formatReviewDate(review.createdAt);
  return (
    <article className="flex h-full min-h-0 flex-col justify-center rounded border border-[#e8e8e1] bg-white p-5 text-[13px] leading-snug text-neutral-800">
      <div style={{ color: ACCENT }}>
        <StarRating value={review.rating} size={14} className="!text-[#f5b400]" />
      </div>
      {review.title ? (
        <p className="mt-2 line-clamp-2 font-semibold text-neutral-900">{review.title}</p>
      ) : null}
      <p className={`line-clamp-5 text-neutral-800 ${review.title ? "mt-1" : "mt-2"}`}>
        {review.body}
      </p>
      <div className="mt-3">
        <p className="truncate font-semibold text-neutral-900">{review.reviewerName}</p>
        <Link
          href={`/products/${review.productSlug}`}
          className="mt-0.5 block truncate text-neutral-600 transition hover:text-neutral-900"
        >
          {review.productName}
        </Link>
        {dateLabel ? <p className="mt-0.5 text-neutral-500 opacity-80">{dateLabel}</p> : null}
      </div>
    </article>
  );
}
