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
  parseNativeProductVideoUrl,
  type ProductReelItem,
} from "@/lib/product-video/url";

export type StickyProductVideoProps = {
  reels: ProductReelItem[];
  startIndex?: number;
  bottomClassName?: string;
};

/** Rad: --rvw-edge aligns chrome to the contained 9:16 video column. */
const FEED_EDGE =
  "max(16px, calc(50% - 28.125vh + 16px))" as const;

function ExpandHintIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m0 8v3a2 2 0 0 0 2 2h3m8-18h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

function MuteIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 9v6h4l5 5V4L9 9H5z" fill="currentColor" stroke="none" />
        <line x1="16" y1="9" x2="22" y2="15" />
        <line x1="22" y1="9" x2="16" y2="15" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 9v6h4l5 5V4L9 9H5z" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

function PlayPauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden style={{ marginLeft: 3 }}>
      <polygon points="7,4 20,12 7,20" />
    </svg>
  );
}

type ParsedReel = ProductReelItem & { src: string };

export function StickyProductVideo({
  reels,
  startIndex = 0,
  bottomClassName = "bottom-4",
}: StickyProductVideoProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const miniVideoRef = useRef<HTMLVideoElement>(null);
  const slideVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const parsed: ParsedReel[] = reels
    .map((r) => {
      const src = parseNativeProductVideoUrl(r.videoUrl);
      return src ? { ...r, src } : null;
    })
    .filter((r): r is ParsedReel => Boolean(r));

  const safeStart = Math.min(Math.max(0, startIndex), Math.max(0, parsed.length - 1));
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(safeStart);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [miniReady, setMiniReady] = useState(false);

  useEffect(() => {
    const el = miniVideoRef.current;
    if (!el || expanded || dismissed) return;
    el.muted = true;
    void el.play().then(() => setMiniReady(true)).catch(() => setMiniReady(true));
  }, [expanded, dismissed, safeStart, parsed.length]);

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
    setPaused(false);
    setShowSwipeHint(parsed.length > 1);
    const t = window.setTimeout(() => setShowSwipeHint(false), 2800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    slideVideoRefs.current.forEach((el, i) => {
      if (!el) return;
      el.muted = muted;
      if (i === activeIndex && !paused) {
        void el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [expanded, activeIndex, muted, paused]);

  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const h = scroller.clientHeight || 1;
    const idx = Math.round(scroller.scrollTop / h);
    const next = Math.min(Math.max(0, idx), parsed.length - 1);
    setActiveIndex(next);
    setPaused(false);
    setShowSwipeHint(false);
  }, [parsed.length]);

  const togglePauseActive = () => {
    setPaused((p) => !p);
  };

  if (!parsed.length || dismissed) return null;

  const mini = parsed[safeStart] ?? parsed[0]!;
  const counterLabel = `${activeIndex + 1} / ${parsed.length}`;

  return (
    <>
      {/* Mini sticky widget — Rad: 120×213, bottom/right 16px, radius 12px */}
      <div
        className={`pointer-events-none fixed right-4 z-[999996] ${bottomClassName}`}
        data-sticky-product-video
      >
        <div
          className={`pointer-events-auto relative overflow-hidden bg-black shadow-[0_6px_20px_rgba(0,0,0,0.3)] transition-opacity duration-400 ${
            miniReady ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: 120,
            height: 213,
            borderRadius: 12,
          }}
        >
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer"
            aria-label="Open product videos"
            onClick={() => setExpanded(true)}
          />
          <video
            ref={miniVideoRef}
            className="pointer-events-none block h-full w-full object-cover"
            src={mini.src}
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
            poster={mini.posterUrl || undefined}
          />
          <button
            type="button"
            aria-label="Hide videos"
            className="absolute right-[6px] top-[6px] z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/55 text-[15px] leading-none text-white"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              setExpanded(false);
            }}
          >
            ×
          </button>
          <span
            className="pointer-events-none absolute bottom-[6px] left-[6px] z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/40 text-white"
            aria-hidden
          >
            <ExpandHintIcon />
          </span>
        </div>
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            className="fixed inset-0 z-[999999] bg-black"
            style={{ ["--rvw-edge" as string]: FEED_EDGE } as CSSProperties}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="pointer-events-none fixed z-[2] rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold tracking-[0.5px] text-white"
              style={{
                top: "calc(16px + env(safe-area-inset-top, 0px))",
                left: "var(--rvw-edge)",
              }}
              aria-live="polite"
            >
              {counterLabel}
            </div>

            <div
              className="pointer-events-none fixed z-[2] flex flex-col gap-2.5"
              style={{
                top: "calc(16px + env(safe-area-inset-top, 0px))",
                right: "var(--rvw-edge)",
              }}
            >
              <button
                type="button"
                aria-label="Close video"
                className="pointer-events-auto flex h-[38px] w-[38px] items-center justify-center rounded-full bg-black/50 text-[22px] font-medium leading-none text-white"
                onClick={() => setExpanded(false)}
              >
                ×
              </button>
              <button
                type="button"
                aria-label={muted ? "Unmute" : "Mute"}
                className="pointer-events-auto flex h-[38px] w-[38px] items-center justify-center rounded-full bg-black/50 text-white"
                onClick={() => setMuted((m) => !m)}
              >
                <MuteIcon muted={muted} />
              </button>
            </div>

            {showSwipeHint && parsed.length > 1 ? (
              <div
                className="pointer-events-none fixed inset-x-0 z-[2] flex flex-col items-center gap-0.5 text-white"
                style={{
                  bottom: "calc(118px + env(safe-area-inset-bottom, 0px))",
                }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 15l6-6 6 6" />
                </svg>
                <span className="text-xs tracking-[0.3px]">Swipe up for more</span>
              </div>
            ) : null}

            <h2 id={titleId} className="sr-only">
              Product videos
            </h2>

            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="h-full overflow-y-auto overscroll-contain"
              style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" } as CSSProperties}
            >
              {parsed.map((reel, i) => (
                <div
                  key={`${reel.productHref}-${i}`}
                  className="relative flex h-full min-h-[100dvh] w-full items-center justify-center bg-black bg-center bg-cover"
                  style={{
                    scrollSnapAlign: "start",
                    scrollSnapStop: "always",
                    height: "100%",
                    minHeight: "100dvh",
                  }}
                >
                  <video
                    ref={(el) => {
                      slideVideoRefs.current[i] = el;
                    }}
                    className="block h-full w-full object-contain"
                    src={reel.src}
                    loop
                    playsInline
                    muted={muted}
                    poster={reel.posterUrl || undefined}
                    preload={Math.abs(i - activeIndex) <= 1 ? "auto" : "none"}
                    onClick={togglePauseActive}
                  />
                  {paused && i === activeIndex ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45">
                        <PlayPauseIcon />
                      </span>
                    </span>
                  ) : null}
                  <div
                    className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 text-white"
                    style={{
                      padding: `48px var(--rvw-edge) calc(20px + env(safe-area-inset-bottom, 0px))`,
                      background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))",
                    }}
                  >
                    <div
                      className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-[1.3]"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                    >
                      {reel.productName}
                    </div>
                    <Link
                      href={reel.productHref}
                      className="block w-full box-border rounded-lg border-[0.5px] border-white/45 bg-white/[0.22] px-0 py-3 text-center text-[15px] font-semibold text-white backdrop-blur-[8px] transition hover:bg-white/30"
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
