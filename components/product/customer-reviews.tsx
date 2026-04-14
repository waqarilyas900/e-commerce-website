"use client";

import { useMemo, useState, type FormEvent } from "react";

type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  verified?: boolean;
};

type Props = {
  rating: number;
  reviewsCount: number;
};

function Stars({
  value,
  size = "text-lg",
  className = "text-amber-400",
}: {
  value: number;
  size?: string;
  className?: string;
}) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`${size} leading-none ${className}`} aria-label={`${rounded} out of 5 stars`}>
      {"★".repeat(rounded)}
      <span className="text-neutral-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

function estimateDistribution(rating: number, count: number): number[] {
  if (count <= 0) return [0, 0, 0, 0, 0];
  const five = Math.max(0, Math.round((rating / 5) * count * 0.7));
  const four = Math.max(0, Math.round((rating / 5) * count * 0.25));
  const three = Math.max(0, Math.round((rating / 5) * count * 0.05));
  const oneTwo = Math.max(0, count - five - four - three);
  const two = Math.floor(oneTwo / 2);
  const one = oneTwo - two;
  return [five, four, three, two, one];
}

function buildMockReviews(rating: number, count: number): Review[] {
  if (count <= 0) return [];
  const base: Review[] = [
    {
      id: "r1",
      name: "Hamza",
      rating: Math.max(4, Math.round(rating)),
      text: "Great quality and comfortable fit. Recommended.",
      verified: true,
    },
    {
      id: "r2",
      name: "Barkat Ali",
      rating: Math.max(4, Math.round(rating) - 1),
      text: "Good fabric and value for money. Delivery was smooth.",
      verified: true,
    },
    {
      id: "r3",
      name: "Talal Mughal",
      rating: Math.max(3, Math.round(rating) - 1),
      text: "Overall good experience. Product matched expectations.",
      verified: true,
    },
  ];
  return base.slice(0, Math.min(3, count));
}

export function CustomerReviews({ rating, reviewsCount }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const hasReviews = reviewsCount > 0;
  const displayRating = Number.isFinite(rating) ? rating : 0;
  const reviews = useMemo(
    () => buildMockReviews(displayRating, reviewsCount),
    [displayRating, reviewsCount],
  );
  const dist = useMemo(
    () => estimateDistribution(displayRating, reviewsCount),
    [displayRating, reviewsCount],
  );
  const maxDist = Math.max(1, ...dist);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormOpen(false);
  }

  return (
    <section className="mt-12 border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Customer Reviews</h2>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-sm border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          {formOpen ? "Cancel review" : "Write a review"}
        </button>
      </div>

      {!hasReviews ? (
        <div className="mt-3 flex items-center gap-3 text-sm text-neutral-700">
          <Stars value={0} size="text-base" />
          <span>Be the first to write a review</span>
        </div>
      ) : (
        <div className="mt-4 border-b border-neutral-200 pb-4">
          <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
            <div>
              <Stars value={displayRating} size="text-xl" />
              <p className="mt-1 text-sm text-neutral-600">Based on {reviewsCount} reviews</p>
            </div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star, i) => (
                <div key={star} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                  <span className="w-10 text-neutral-600">{star}★</span>
                  <div className="h-2 overflow-hidden rounded bg-neutral-200">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(dist[i] / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-neutral-600">{dist[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {formOpen ? (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700">
                DISPLAY NAME
              </label>
              <input
                required
                placeholder="Display name"
                className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                placeholder="Your email address"
                className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700">
              RATING
            </label>
            <Stars value={5} size="text-lg" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700">
              REVIEW TITLE
            </label>
            <input
              required
              placeholder="Give your review a title"
              className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700">
              REVIEW CONTENT
            </label>
            <textarea
              required
              rows={5}
              placeholder="Start writing here..."
              className="w-full resize-y border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-[0.14em] text-neutral-700">
              PICTURE/VIDEO (OPTIONAL)
            </label>
            <label
              htmlFor="review-media-upload"
              className="flex h-24 w-24 cursor-pointer items-center justify-center border border-neutral-300 bg-neutral-50 text-3xl text-neutral-300 hover:bg-neutral-100"
            >
              📷
            </label>
            <input
              id="review-media-upload"
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = e.target.files;
                if (!files) {
                  setSelectedFiles([]);
                  return;
                }
                setSelectedFiles(Array.from(files).map((f) => f.name));
              }}
            />
            {selectedFiles.length > 0 ? (
              <p className="mt-2 wrap-break-word text-xs text-neutral-600">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected:{" "}
                {selectedFiles.slice(0, 2).join(", ")}
                {selectedFiles.length > 2 ? ` +${selectedFiles.length - 2} more` : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-neutral-500">
                Tap/click camera icon to upload from your device.
              </p>
            )}
          </div>
          <p className="text-xs text-neutral-600">
            We will only contact you about the review you left, and only if necessary.
          </p>
          <button
            type="submit"
            className="rounded bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Submit Review
          </button>
        </form>
      ) : null}

      {hasReviews ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {reviews.map((r) => (
            <article key={r.id} className="border border-neutral-200 bg-neutral-50 p-4">
              <p className="font-semibold text-neutral-900">{r.name}</p>
              {r.verified ? (
                <span className="mt-1 inline-flex bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Verified Buyer
                </span>
              ) : null}
              <div className="mt-2">
                <Stars value={r.rating} size="text-sm" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{r.text}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
