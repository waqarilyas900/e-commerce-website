"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { StarRating } from "@/components/ui/star-rating";
import { useScrollLock } from "@/lib/scroll-lock";
import type { ReviewMediaItem } from "@/lib/cache/store-reviews-page";

const ACCENT = "#FBCD0A";
/** Soft brand orange tints — match site chrome (`#E0703A`). */
const BRAND_SOFT_BG = "rgba(224, 112, 58, 0.1)";
const BRAND_AVATAR_BG = "rgba(224, 112, 58, 0.18)";
const PREVIEW_VISIBLE = 8;
const MODAL_THUMB_VISIBLE = 12;

type Props = {
  items: ReviewMediaItem[];
  openIndex: number | null;
  onOpen: (index: number) => void;
  onClose: () => void;
};

function isRemoteCdn(src: string): boolean {
  return src.includes("slatic.net") || src.includes("alicdn.com");
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path
        d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Rad / Judge.me media preview (8-thumb grid, + on last) + split lightbox modal.
 */
export function ReviewMediaGallery({ items, openIndex, onOpen, onClose }: Props) {
  const titleId = useId();
  const open = openIndex != null && items.length > 0;
  const active = open && openIndex != null ? items[openIndex] ?? null : null;
  const [thumbStart, setThumbStart] = useState(0);

  useScrollLock(open);

  const go = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      const i = ((next % items.length) + items.length) % items.length;
      onOpen(i);
    },
    [items.length, onOpen],
  );

  useEffect(() => {
    if (!open || openIndex == null) return;
    // Keep active thumb in the visible modal strip
    if (openIndex < thumbStart) setThumbStart(openIndex);
    else if (openIndex >= thumbStart + MODAL_THUMB_VISIBLE) {
      setThumbStart(Math.max(0, openIndex - MODAL_THUMB_VISIBLE + 1));
    }
  }, [open, openIndex, thumbStart]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go((openIndex ?? 0) - 1);
      if (e.key === "ArrowRight") go((openIndex ?? 0) + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openIndex, onClose, go]);

  const preview = items.slice(0, PREVIEW_VISIBLE);
  const showPlus = items.length > PREVIEW_VISIBLE;
  const modalThumbs = items.slice(thumbStart, thumbStart + MODAL_THUMB_VISIBLE);
  const canPrevThumbs = thumbStart > 0;
  const canNextThumbs = thumbStart + MODAL_THUMB_VISIBLE < items.length;

  if (items.length === 0) return null;

  const initial = (active?.reviewerName?.trim()?.[0] || "C").toUpperCase();

  return (
    <>
      <div
        className="grid w-full max-w-[250px] grid-cols-4 gap-1.5"
        role="group"
        aria-label={`Thumbnails for ${items.length} items`}
      >
        {preview.map((item, i) => {
          const isLast = i === PREVIEW_VISIBLE - 1;
          const withPlus = isLast && showPlus;
          return (
            <button
              key={`${item.id}-${i}`}
              type="button"
              aria-label={withPlus ? `View all ${items.length} photos` : `Go to item ${i + 1}`}
              onClick={() => onOpen(i)}
              className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
            >
              <Image
                src={item.image}
                alt=""
                fill
                sizes="60px"
                className="object-cover"
                unoptimized={isRemoteCdn(item.image)}
              />
              {withPlus ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  <PlusIcon className="h-6 w-6" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {open && active ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-black/55"
            aria-label="Close"
            onClick={onClose}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex h-[min(92dvh,600px)] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:flex-row"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-black/75"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Left — media */}
            <div className="relative flex h-[min(42vh,280px)] w-full shrink-0 flex-col bg-neutral-100 sm:h-full sm:w-1/2">
              <div className="relative min-h-0 flex-1">
                <Image
                  src={active.image}
                  alt={active.productName}
                  fill
                  sizes="400px"
                  className="object-contain"
                  unoptimized={isRemoteCdn(active.image)}
                  priority
                />
                {items.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => go((openIndex ?? 0) - 1)}
                      className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow hover:bg-white"
                      aria-label="Previous"
                    >
                      <Chevron dir="prev" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go((openIndex ?? 0) + 1)}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow hover:bg-white"
                      aria-label="Next"
                    >
                      <Chevron dir="next" />
                    </button>
                  </>
                ) : null}
              </div>

              {items.length > 1 ? (
                <div className="relative flex items-center gap-1 border-t border-neutral-200 bg-white px-2 py-2">
                  {canPrevThumbs ? (
                    <button
                      type="button"
                      aria-label="Earlier photos"
                      onClick={() => setThumbStart((s) => Math.max(0, s - 1))}
                      className="flex h-8 w-6 shrink-0 items-center justify-center text-neutral-700"
                    >
                      <Chevron dir="prev" />
                    </button>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}
                  <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                    {modalThumbs.map((item, offset) => {
                      const idx = thumbStart + offset;
                      const pressed = idx === openIndex;
                      return (
                        <button
                          key={`modal-${item.id}-${idx}`}
                          type="button"
                          aria-label={`Go to item ${idx + 1}`}
                          aria-pressed={pressed}
                          onClick={() => onOpen(idx)}
                          className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-md border ${
                            pressed
                              ? "border-neutral-900 ring-1 ring-neutral-900"
                              : "border-neutral-200"
                          }`}
                        >
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized={isRemoteCdn(item.image)}
                          />
                        </button>
                      );
                    })}
                  </div>
                  {canNextThumbs ? (
                    <button
                      type="button"
                      aria-label="More photos"
                      onClick={() =>
                        setThumbStart((s) =>
                          Math.min(Math.max(0, items.length - MODAL_THUMB_VISIBLE), s + 1),
                        )
                      }
                      className="flex h-8 w-6 shrink-0 items-center justify-center text-neutral-700"
                    >
                      <Chevron dir="next" />
                    </button>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}
                </div>
              ) : null}
            </div>

            {/* Right — review (Judge.me / Rad layout) */}
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-5 sm:w-1/2 sm:p-7">
              <span id={titleId} className="sr-only">
                {active.title || `Review by ${active.reviewerName}`}
              </span>

              <StarRating value={active.rating} size={18} labeled className="!text-[#FBCD0A]" />

              <div className="mt-4 flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-neutral-800"
                  style={{ backgroundColor: BRAND_AVATAR_BG }}
                  aria-hidden
                >
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {active.reviewerName}
                  </p>
                  {active.verifiedBuyer ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutral-600">
                      <span
                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-500 text-[9px] text-white"
                        aria-hidden
                      >
                        ✓
                      </span>
                      Verified Buyer
                    </p>
                  ) : null}
                </div>
              </div>

              {active.title ? (
                <p className="mt-4 text-base font-bold leading-snug text-neutral-900">
                  {active.title}
                </p>
              ) : null}

              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-800">
                {active.body}
              </p>

              {/* Rad product card — soft primary tint box */}
              <div className="mt-auto pt-6">
                <Link
                  href={`/products/${active.productSlug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg p-2 transition hover:opacity-90"
                  style={{ backgroundColor: BRAND_SOFT_BG }}
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white">
                    <Image
                      src={active.productImage || active.image}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized={isRemoteCdn(active.productImage || active.image)}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-[#7b7b7b]">Review for</span>
                    <span className="block truncate text-sm text-neutral-900 underline underline-offset-2">
                      {active.productName}
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
