"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  parseProductVideoUrl,
  productVideoCanAutoplay,
  type ProductVideoSource,
} from "@/lib/product-video/url";

export type StickyProductVideoProps = {
  videoUrl: string;
  productName: string;
  /** When set, expanded modal can deep-link to the product. */
  productHref?: string | null;
  /** Extra bottom offset (e.g. mobile sticky ATC bar on PDP). */
  bottomClassName?: string;
};

function ExpandHintIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86Z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function VideoFrame({
  source,
  title,
  className,
  interactive = false,
}: {
  source: ProductVideoSource;
  title: string;
  className?: string;
  interactive?: boolean;
}) {
  if (source.kind === "direct") {
    return (
      <video
        className={className}
        src={source.src}
        autoPlay
        muted
        loop
        playsInline
        controls={interactive}
        preload="metadata"
        aria-label={title}
      />
    );
  }

  if (source.kind === "instagram") {
    // Instagram embeds need ~320×568; scale into the mini tile so the reel cover shows.
    return (
      <iframe
        title={title}
        src={source.embedUrl}
        className={className}
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        allowFullScreen
        loading="eager"
        scrolling="no"
      />
    );
  }

  return (
    <iframe
      title={title}
      src={source.embedUrl}
      className={className}
      allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
      allowFullScreen
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function MiniInstagramPreview({
  source,
  title,
}: {
  source: Extract<ProductVideoSource, { kind: "instagram" }>;
  title: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-950">
      <iframe
        title={title}
        src={source.embedUrl}
        className="pointer-events-none absolute left-0 top-0 border-0"
        style={{
          width: 320,
          height: 568,
          transform: "scale(0.375)",
          transformOrigin: "top left",
        }}
        allow="encrypted-media; picture-in-picture; clipboard-write"
        loading="eager"
        scrolling="no"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <PlayIcon className="ml-0.5 h-5 w-5" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
          <InstagramGlyph className="h-3 w-3" />
          Tap to play
        </span>
      </div>
    </div>
  );
}

export function StickyProductVideo({
  videoUrl,
  productName,
  productHref,
  bottomClassName = "bottom-4 sm:bottom-5",
}: StickyProductVideoProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const source = parseProductVideoUrl(videoUrl);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  if (!source || dismissed) return null;

  const label = productName.trim() || "Product video";
  const autoplay = productVideoCanAutoplay(source);

  return (
    <>
      <div
        className={`pointer-events-none fixed right-4 z-160 sm:right-5 ${bottomClassName}`}
        data-sticky-product-video
      >
        <div className="pointer-events-auto relative h-[213px] w-[120px] overflow-hidden rounded-xl border border-black/10 bg-black shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer"
            aria-label={`Expand video for ${label}`}
            onClick={() => setExpanded(true)}
          />
          {source.kind === "instagram" ? (
            <MiniInstagramPreview source={source} title={label} />
          ) : (
            <VideoFrame
              source={source}
              title={label}
              className="pointer-events-none absolute inset-0 h-full w-full border-0 object-cover"
            />
          )}
          {!autoplay && source.kind !== "instagram" ? (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-black/25">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                <PlayIcon className="ml-0.5 h-5 w-5" />
              </span>
            </div>
          ) : null}
          <button
            type="button"
            aria-label="Close video"
            className="absolute right-1.5 top-1.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-sm text-white backdrop-blur-sm transition hover:bg-black/75"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              setExpanded(false);
            }}
          >
            ×
          </button>
          <span
            className="pointer-events-none absolute bottom-1.5 left-1.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/45 text-white backdrop-blur-sm"
            aria-hidden
          >
            <ExpandHintIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            className="fixed inset-0 z-230 flex items-center justify-center bg-black/80 p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              className={`relative flex w-full flex-col gap-3 ${
                source.kind === "instagram" ? "max-w-lg" : "max-w-md"
              }`}
              initial={reduceMotion ? false : { scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? undefined : { scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 id={titleId} className="text-base font-medium text-white sm:text-lg">
                  {label}
                </h2>
                <button
                  type="button"
                  aria-label="Close expanded video"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white"
                  onClick={() => setExpanded(false)}
                >
                  ×
                </button>
              </div>
              <div
                className={`relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl ${
                  source.kind === "instagram"
                    ? "min-h-[min(72vh,640px)]"
                    : "aspect-[9/16]"
                }`}
              >
                <VideoFrame
                  source={source}
                  title={label}
                  interactive
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
              {source.kind === "instagram" ? (
                <p className="text-center text-xs text-white/70">
                  Instagram blocks autoplay on websites — tap play on the reel, or{" "}
                  <a
                    href={source.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-white"
                  >
                    open on Instagram
                  </a>
                  .
                </p>
              ) : null}
              {productHref ? (
                <Link
                  href={productHref}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand-accent,#E0703A)] px-5 text-sm font-medium text-white transition hover:brightness-105"
                  onClick={() => setExpanded(false)}
                >
                  View product
                </Link>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
