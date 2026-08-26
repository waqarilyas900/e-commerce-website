"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  parseProductVideoUrl,
  type ProductVideoSource,
} from "@/lib/product-video/url";
import { useStickyProductVideoPresence } from "@/components/product/sticky-product-video-context";

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

function VideoFrame({
  source,
  title,
  className,
}: {
  source: ProductVideoSource;
  title: string;
  className?: string;
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
        controls={false}
        preload="metadata"
        aria-label={title}
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
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
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
  const { setVisible } = useStickyProductVideoPresence();
  const source = parseProductVideoUrl(videoUrl);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const show = Boolean(source) && !dismissed;
    setVisible(show);
    return () => setVisible(false);
  }, [source, dismissed, setVisible]);

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
          <VideoFrame
            source={source}
            title={label}
            className="pointer-events-none absolute inset-0 h-full w-full border-0 object-cover"
          />
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
              className="relative flex w-full max-w-md flex-col gap-3"
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
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
                <VideoFrame
                  source={source}
                  title={label}
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>
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
