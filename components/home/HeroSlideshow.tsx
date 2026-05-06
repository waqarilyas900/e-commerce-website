"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HeroSlide } from "@/app/lib/store-brand.types";

function slideStableKey(slide: HeroSlide, index: number) {
  return slide.id ?? `slide-${index}-${slide.title}-${slide.image}`;
}

const heroTitle = Poppins({
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
});

/** Matches radstore.pk theme: transparent → transparent @ 40% → dark @ 100% */
const HERO_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)";

/** Time between auto-advances (mobile uses a tighter loop for Lighthouse Speed Index). */
const INTERVAL_MS = 6000;

const easeHero: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Animation timings. Mobile cuts durations roughly in half so visual
 * completeness lands sooner — Lighthouse Speed Index keeps integrating
 * change until the hero settles, so long zoom/blur transitions disproportionately
 * hurt mobile scores even when LCP is fine.
 */
const T_SLIDE_MAIN = 0.7;
const T_SLIDE_OPACITY = 0.55;
const T_SLIDE_BLUR = 0.6;
const T_IMAGE_ZOOM = 0.85;
const T_TITLE = 0.55;
const T_TITLE_DELAY = 0.18;
const T_REDUCED = 0.3;

/** Noticeable slide + blur when the hero image changes (full motion). */
const slideLayerVariantsFull = {
  enter: (direction: number) => ({
    x: direction >= 0 ? "28%" : "-28%",
    opacity: 0,
    scale: 1.06,
    filter: "blur(12px)",
  }),
  center: {
    x: "0%",
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? "-22%" : "22%",
    opacity: 0,
    scale: 0.94,
    filter: "blur(8px)",
  }),
};

/** Reduced motion: opacity crossfade only. */
const slideLayerVariantsReduced = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

function ArrowPrevIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowNextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const next = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const autoRun = !paused;

  useEffect(() => {
    if (!autoRun) return;

    const start = Date.now();
    queueMicrotask(() => setProgress(0));
    const progressId = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / INTERVAL_MS);
      setProgress(p);
    }, 100);
    const advanceId = window.setTimeout(() => {
      setProgress(1);
      next();
    }, INTERVAL_MS);

    return () => {
      window.clearInterval(progressId);
      window.clearTimeout(advanceId);
    };
  }, [index, autoRun, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (
        t?.closest?.(
          'button,a,input,textarea,select,[role="combobox"]',
        )
      )
        return;
      e.preventDefault();
      setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const slide = slides[index];
  if (!slide || slides.length === 0) {
    return null;
  }

  return (
    <section
      id="shopify-section-template-hero"
      className="shopify-section index-section--hero index-section--slideshow w-full bg-[#111]"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      data-section-type="slideshow-section"
    >
      {/* Natural hero height ≈ radstore: image ratio 2.4:1 (2400×1000) */}
      <div className="slideshow-wrapper relative w-full">
        <div className="relative w-full overflow-hidden">
          <div className="relative aspect-12/5 w-full max-w-[100vw]">
            <AnimatePresence initial={false} custom={direction} mode="sync">
              <motion.div
                key={slideStableKey(slide, index)}
                custom={direction}
                variants={
                  prefersReducedMotion
                    ? slideLayerVariantsReduced
                    : slideLayerVariantsFull
                }
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: prefersReducedMotion ? T_REDUCED : T_SLIDE_MAIN,
                  ease: easeHero,
                  opacity: {
                    duration: prefersReducedMotion ? T_REDUCED : T_SLIDE_OPACITY,
                    ease: easeHero,
                  },
                  filter: {
                    duration: prefersReducedMotion ? T_REDUCED : T_SLIDE_BLUR,
                    ease: easeHero,
                  },
                  x: { duration: prefersReducedMotion ? T_REDUCED : T_SLIDE_MAIN, ease: easeHero },
                  scale: { duration: prefersReducedMotion ? T_REDUCED : T_SLIDE_MAIN, ease: easeHero },
                }}
                className="absolute inset-0 overflow-hidden will-change-transform"
              >
                <motion.div
                  key={`hero-img-${slideStableKey(slide, index)}`}
                  className="absolute inset-0"
                  initial={
                    prefersReducedMotion
                      ? { scale: 1 }
                      : { scale: 1.14 }
                  }
                  animate={{ scale: 1 }}
                  transition={{
                    duration: prefersReducedMotion ? 0.01 : T_IMAGE_ZOOM,
                    ease: easeHero,
                  }}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    priority={index === 0}
                    fetchPriority={index === 0 ? "high" : "low"}
                    /**
                     * Mobile gets a smaller responsive width than desktop so
                     * Next/Image serves a 640w/828w variant on phones instead
                     * of full 1280w hero — saves ~200-400 KB on mobile LCP.
                     */
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1400px"
                    className="object-cover object-center"
                  />
                </motion.div>
                <div
                  className="pointer-events-none absolute inset-0 z-1"
                  style={{ backgroundImage: HERO_OVERLAY }}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex justify-center shell-x pb-20 sm:pb-24 md:pb-28">
                  <motion.div
                    key={`hero-title-${slideStableKey(slide, index)}`}
                    initial={
                      prefersReducedMotion
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 40, scale: 0.94 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: prefersReducedMotion ? 0.15 : T_TITLE,
                      delay: prefersReducedMotion ? 0 : T_TITLE_DELAY,
                      ease: easeHero,
                    }}
                  >
                    <Link
                      href={slide.href}
                      className={`${heroTitle.className} pointer-events-auto block text-center text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl`}
                    >
                      {slide.title}
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Shopify: visually hidden pause — keep for a11y only */}
          <button
            type="button"
            className="sr-only"
            aria-live="polite"
            onClick={() => setPaused((p) => !p)}
          >
            {paused || prefersReducedMotion ? "Play slideshow" : "Pause slideshow"}
          </button>

          {/* Thin progress strip — bottom edge of carousel (under buttons visually) */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-15 w-full"
            role="presentation"
          >
            <div
              className="h-[2px] w-full overflow-hidden bg-white/22 md:h-[3px]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label="Slide autoplay progress"
            >
              <div
                className="h-full bg-white"
                style={{
                  width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                  transition: "width 80ms linear",
                }}
              />
            </div>
          </div>

        </div>

        {/* Arrow controls straddle hero bottom edge (half on hero, half on content below) — all breakpoints. */}
        <div className="pointer-events-none absolute bottom-0 right-4 z-10 flex translate-y-1/2 items-center gap-2 sm:right-6 sm:gap-2.5 lg:right-8">
          <button
            type="button"
            onClick={prev}
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md ring-1 ring-neutral-200/80 transition hover:bg-neutral-50 sm:h-11 sm:w-11 md:h-12 md:w-12"
            aria-label="Previous slide"
          >
            <ArrowPrevIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => next()}
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md ring-1 ring-neutral-200/80 transition hover:bg-neutral-50 sm:h-11 sm:w-11 md:h-12 md:w-12"
            aria-label="Next slide"
          >
            <ArrowNextIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
