"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { AppSelect } from "@/components/ui/app-select";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewMediaGallery } from "@/components/reviews/review-media-gallery";
import type { HomeReviewHighlight } from "@/lib/cache/home-review-highlights";
import type {
  ReviewMediaItem,
  StoreReviewBreakdown,
  StoreReviewSort,
} from "@/lib/cache/store-reviews-page";
import type { StoreReviewAggregate } from "@/lib/cache/store-review-aggregate";
import { scaleBreakdownToTotal } from "@/lib/reviews/scale-breakdown";

type ReviewRow = HomeReviewHighlight & { verifiedBuyer: boolean };

type Props = {
  aggregate: StoreReviewAggregate;
  breakdown: StoreReviewBreakdown;
  media: ReviewMediaItem[];
  reviews: ReviewRow[];
  total: number;
  page: number;
  pageCount: number;
  sort: StoreReviewSort;
  starFilter: number | null;
};

const SORT_OPTIONS: { value: StoreReviewSort; label: string }[] = [
  { value: "newest", label: "Most recent" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest", label: "Lowest rating" },
];

/** Judge.me / Rad accent */
const ACCENT = "#FBCD0A";

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReviewCard({ r }: { r: ReviewRow }) {
  const [expanded, setExpanded] = useState(false);
  const long = r.body.length > 180;

  return (
    <article className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <StarRating value={r.rating} size={18} labeled className="!text-[#FBCD0A]" />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-neutral-900">{r.reviewerName}</p>
        {r.verifiedBuyer ? (
          <span className="rounded-sm border border-neutral-900 px-1.5 py-0.5 text-[11px] font-medium leading-none text-neutral-900">
            Verified Buyer
          </span>
        ) : null}
      </div>

      {r.title ? (
        <h3 className="mt-3 text-base font-bold leading-snug text-neutral-900">{r.title}</h3>
      ) : null}

      <p
        className={`mt-2 text-sm leading-relaxed text-neutral-800 ${
          !expanded && long ? "line-clamp-4" : ""
        }`}
      >
        {r.body}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 self-start text-sm font-medium text-neutral-900 underline underline-offset-2"
        >
          {expanded ? "Less" : "More"}
        </button>
      ) : null}

      {r.productImage ? (
        <Link
          href={`/products/${r.productSlug}`}
          className="relative mt-4 block h-[72px] w-[72px] overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
        >
          <Image
            src={r.productImage}
            alt={r.productName}
            fill
            sizes="72px"
            className="object-cover"
            unoptimized={
              r.productImage.includes("slatic.net") ||
              r.productImage.includes("alicdn.com")
            }
          />
        </Link>
      ) : null}

      <p className="mt-auto pt-4 text-xs text-neutral-500">
        Review for{" "}
        <Link
          href={`/products/${r.productSlug}`}
          className="font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-900"
        >
          {r.productName}
        </Link>
        {formatReviewDate(r.createdAt) ? (
          <span>
            {" "}
            · {formatReviewDate(r.createdAt)}
          </span>
        ) : null}
      </p>
    </article>
  );
}

export function CustomerReviewsView({
  aggregate,
  breakdown,
  media,
  reviews,
  total,
  page,
  pageCount,
  sort,
  starFilter,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);

  const pushQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      const q = sp.toString();
      startTransition(() => {
        router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );
  const sortValue = useMemo(
    () => sortOptions.find((o) => o.value === sort) ?? sortOptions[0]!,
    [sort, sortOptions],
  );

  /** Same headline totals as homepage TrustRatingStrip (products.reviews_count). */
  const displayTotal = Math.max(aggregate.totalReviews, breakdown.total);
  const displayBreakdown = useMemo(
    () => scaleBreakdownToTotal(breakdown, displayTotal),
    [breakdown, displayTotal],
  );

  const maxBar = Math.max(1, ...displayBreakdown.counts);
  const ratingLabel = aggregate.averageRating.toFixed(1);
  const totalFmt = new Intl.NumberFormat("en-US").format(displayTotal);
  const tabCount = starFilter != null ? total : displayTotal;
  const listTotalFmt = new Intl.NumberFormat("en-US").format(tabCount);

  return (
    <div
      className={pending ? "opacity-70 transition-opacity" : undefined}
      style={
        {
          "--review-accent": ACCENT,
        } as CSSProperties
      }
    >
      {/* Centered score row — Judge.me header */}
      <div className="flex flex-col items-center text-center">
        <p className="text-base font-medium text-neutral-900 sm:text-lg">
          Customer reviews
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <span className="text-[1.65rem] leading-none" style={{ color: ACCENT }} aria-hidden>
            ★
          </span>
          <span className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            {ratingLabel}
          </span>
          <span className="text-base text-neutral-600 sm:text-lg">
            {totalFmt} reviews
          </span>
        </div>
      </div>

      {/* Histogram | media | Write — space-between like Rad */}
      <div className="mt-10 flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <div
          className="w-full max-w-[250px] space-y-2.5"
          role="list"
          aria-label="Rating breakdown"
        >
          {[5, 4, 3, 2, 1].map((star, i) => {
            const count = displayBreakdown.counts[i] ?? 0;
            const active = starFilter === star;
            return (
              <button
                key={star}
                type="button"
                role="listitem"
                onClick={() =>
                  pushQuery({
                    star: active ? null : String(star),
                    page: null,
                  })
                }
                className={`grid w-full grid-cols-[1.75rem_1fr_2.75rem] items-center gap-2 rounded-sm px-0.5 py-0.5 text-left text-sm transition ${
                  active ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
                aria-pressed={active}
                aria-label={`${count.toLocaleString("en-US")} reviews with ${star} star rating`}
              >
                <span className="inline-flex items-center gap-0.5 font-medium text-neutral-800">
                  {star}
                  <span style={{ color: ACCENT }} aria-hidden>
                    ★
                  </span>
                </span>
                <div className="h-1.5 overflow-hidden rounded-sm bg-neutral-100">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${(count / maxBar) * 100}%`,
                      backgroundColor: ACCENT,
                    }}
                  />
                </div>
                <span className="text-right tabular-nums text-neutral-700">
                  {count.toLocaleString("en-US")}
                </span>
              </button>
            );
          })}
          {starFilter != null ? (
            <button
              type="button"
              onClick={() => pushQuery({ star: null, page: null })}
              className="mt-1 text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-950"
            >
              Clear filter
            </button>
          ) : null}
        </div>

        <ReviewMediaGallery
          items={media}
          openIndex={mediaIndex}
          onOpen={setMediaIndex}
          onClose={() => setMediaIndex(null)}
        />

        <div className="flex w-full max-w-[240px] flex-col items-center gap-2 lg:items-end">
          <Link
            href="/collections"
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 sm:w-auto"
            style={{ backgroundColor: ACCENT }}
          >
            Write a review
          </Link>
          <p className="text-center text-xs leading-relaxed text-neutral-500 lg:text-right">
            Open any product to leave a review after you shop.
          </p>
        </div>
      </div>

      {/* Tabs + sort — Rad product reviews toolbar */}
      <div className="mt-12 border-b border-neutral-200">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex gap-6" role="tablist" aria-label="Review type">
            <button
              type="button"
              role="tab"
              aria-selected
              className="border-b-2 border-neutral-900 pb-3 text-sm font-semibold text-neutral-900"
            >
              Product reviews ({listTotalFmt})
            </button>
          </div>
          <div className="w-[min(100%,220px)] pb-2">
            <AppSelect
              aria-label="Sort reviews by"
              options={sortOptions}
              value={sortValue}
              onChange={(opt) => {
                if (!opt) return;
                pushQuery({ sort: opt.value, page: null });
              }}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {/* Card grid — 4 cols on xl like Judge.me on Rad */}
      {reviews.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-600">
          No reviews match this filter yet.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reviews.map((r) => (
            <li key={r.id} className="min-h-0">
              <ReviewCard r={r} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t border-neutral-200 pt-6"
          aria-label="Review pages"
        >
          <button
            type="button"
            disabled={page <= 1 || pending}
            onClick={() => pushQuery({ page: page <= 2 ? null : String(page - 1) })}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 text-sm text-neutral-600">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount || pending}
            onClick={() => pushQuery({ page: String(page + 1) })}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
