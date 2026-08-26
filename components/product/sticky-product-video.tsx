"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  parseProductVideoUrl,
  productVideoCanAutoplay,
  type ProductReelItem,
  type ProductVideoSource,
} from "@/lib/product-video/url";

export type StickyProductVideoProps = {
  /** Full reels playlist (home = all products with video; PDP = usually one). */
  reels: ProductReelItem[];
  /** Index to open first / show in mini widget. */
  startIndex?: number;
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

function MuteIcon({ muted, className }: { muted: boolean; className?: string }) {
  if (muted) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 9v6h4l5 5V4L9 9H5z" fill="currentColor" stroke="none" />
        <line x1="16" y1="9" x2="22" y2="15" />
        <line x1="22" y1="9" x2="16" y2="15" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 9v6h4l5 5V4L9 9H5z" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

function SlideMedia({
  source,
  title,
  active,
  muted,
  posterUrl,
}: {
  source: ProductVideoSource;
  title: string;
  active: boolean;
  muted: boolean;
  posterUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (active) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active, muted]);

  if (source.kind === "direct") {
    return (
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={source.src}
        loop
        playsInline
        muted={muted}
        poster={posterUrl || undefined}
        preload={active ? "auto" : "metadata"}
        aria-label={title}
      />
    );
  }

  if (source.kind === "youtube") {
    // Remount when becoming active so YouTube autoplay restarts for the visible slide.
    if (!active) {
      return posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-neutral-950" />
      );
    }
    const params = new URLSearchParams({
      autoplay: "1",
      mute: muted ? "1" : "0",
      loop: "1",
      playlist: source.id,
      playsinline: "1",
      controls: "0",
      modestbranding: "1",
      rel: "0",
    });
    return (
      <iframe
        key={`yt-${source.id}-${muted ? "m" : "u"}`}
        title={title}
        src={`https://www.youtube.com/embed/${source.id}?${params.toString()}`}
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        allowFullScreen
      />
    );
  }

  // Instagram / Facebook — tap-to-play embeds (no reliable autoplay).
  return (
    <iframe
      title={title}
      src={active ? source.embedUrl : undefined}
      className="absolute inset-0 h-full w-full border-0 bg-black"
      allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
      allowFullScreen
      loading={active ? "eager" : "lazy"}
    />
  );
}

function MiniPreview({
  source,
  title,
  posterUrl,
}: {
  source: ProductVideoSource;
  title: string;
  posterUrl?: string | null;
}) {
  const canAutoplay = productVideoCanAutoplay(source);

  if (canAutoplay && source.kind === "direct") {
    return (
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src={source.src}
        autoPlay
        muted
        loop
        playsInline
        poster={posterUrl || undefined}
        preload="metadata"
        aria-label={title}
      />
    );
  }

  if (canAutoplay && source.kind === "youtube") {
    return (
      <iframe
        title={title}
        src={source.embedUrl}
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture"
        loading="eager"
      />
    );
  }

  // Instagram / Facebook: product poster + play affordance (embeds don't autoplay).
  return (
    <div className="absolute inset-0 bg-neutral-950">
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <PlayIcon className="ml-0.5 h-5 w-5" />
        </span>
        <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
          Tap to open
        </span>
      </div>
    </div>
  );
}

export function StickyProductVideo({
  reels,
  startIndex = 0,
  bottomClassName = "bottom-4 sm:bottom-5",
}: StickyProductVideoProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const parsed = reels
    .map((r) => {
      const source = parseProductVideoUrl(r.videoUrl);
      return source ? { ...r, source } : null;
    })
    .filter((r): r is ProductReelItem & { source: ProductVideoSource } => Boolean(r));

  const safeStart = Math.min(Math.max(0, startIndex), Math.max(0, parsed.length - 1));
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(safeStart);
  const [muted, setMuted] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

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

  useEffect(() => {
    if (!expanded) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const slide = scroller.children[safeStart] as HTMLElement | undefined;
    if (slide) {
      slide.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    }
    setActiveIndex(safeStart);
    setShowSwipeHint(parsed.length > 1);
    const t = window.setTimeout(() => setShowSwipeHint(false), 2800);
    return () => window.clearTimeout(t);
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const h = scroller.clientHeight || 1;
    const idx = Math.round(scroller.scrollTop / h);
    setActiveIndex(Math.min(Math.max(0, idx), parsed.length - 1));
    setShowSwipeHint(false);
  }, [parsed.length]);

  if (!parsed.length || dismissed) return null;

  const mini = parsed[safeStart] ?? parsed[0]!;
  const counterLabel = `${activeIndex + 1} / ${parsed.length}`;

  const openFeed = () => setExpanded(true);

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
            aria-label={`Open reels for ${mini.productName}`}
            onClick={openFeed}
          />
          <MiniPreview
            source={mini.source}
            title={mini.productName}
            posterUrl={mini.posterUrl}
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
            className="fixed inset-0 z-230 bg-black"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div
                className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
                aria-live="polite"
              >
                {counterLabel}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                  onClick={() => setMuted((m) => !m)}
                >
                  <MuteIcon muted={muted} className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  aria-label="Close reels"
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg text-white backdrop-blur-sm"
                  onClick={() => setExpanded(false)}
                >
                  ×
                </button>
              </div>
            </div>

            {showSwipeHint && parsed.length > 1 ? (
              <div className="pointer-events-none absolute left-1/2 top-16 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-white/80">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 15l6-6 6 6" />
                </svg>
                <span className="text-xs">Swipe up for more</span>
              </div>
            ) : null}

            <h2 id={titleId} className="sr-only">
              Product reels
            </h2>

            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" } as CSSProperties}
            >
              {parsed.map((reel, i) => (
                <div
                  key={`${reel.productHref}-${i}`}
                  className="relative flex h-[100dvh] w-full snap-start snap-always flex-col justify-end"
                >
                  <SlideMedia
                    source={reel.source}
                    title={reel.productName}
                    active={expanded && i === activeIndex}
                    muted={muted}
                    posterUrl={reel.posterUrl}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24">
                    <p className="pointer-events-none line-clamp-2 text-base font-medium leading-snug text-white sm:text-lg">
                      {reel.productName}
                    </p>
                    <Link
                      href={reel.productHref}
                      className="pointer-events-auto mt-3 inline-flex h-11 items-center justify-center rounded-full border border-white/25 bg-white/15 px-5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/25"
                      onClick={() => setExpanded(false)}
                    >
                      View product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
