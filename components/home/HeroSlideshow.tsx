"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HeroSlide } from "@/app/lib/store-brand.types";
import { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES } from "@/lib/images/hero";

export { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES };

function slideStableKey(slide: HeroSlide, index: number) {
  return slide.id ?? `slide-${index}-${slide.title}-${slide.image}`;
}

const HERO_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)";

/** Delay autoplay so LCP can settle before the carousel starts moving. */
const AUTOPLAY_START_MS = 8000;
const INTERVAL_MS = 7000;

const easeHero: [number, number, number, number] = [0.22, 1, 0.36, 1];

const T_SLIDE_MAIN = 0.55;
const T_SLIDE_OPACITY = 0.45;
const T_TITLE = 0.4;
const T_TITLE_DELAY = 0.08;
const T_REDUCED = 0.25;

/** No blur filters ÔÇö blur forces expensive paint and hurts mobile SI/LCP. */
const slideLayerVariantsFull = {
  enter: (direction: number) => ({
    x: direction >= 0 ? "18%" : "-18%",
    opacity: 0,
  }),
  center: { x: "0%", opacity: 1 },
  exit: (direction: number) => ({
    x: direction >= 0 ? "-14%" : "14%",
    opacity: 0,
  }),
};

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

function HeroSlideImage({
  slide,
  priority,
}: {
  slide: HeroSlide;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        src={slide.image}
        alt={slide.title?.trim() ? slide.title : "Featured collection"}
        fill
        priority={priority}
        fetchPriority={priority ? "high" : "low"}
        quality={HERO_IMAGE_QUALITY}
        sizes={HERO_IMAGE_SIZES}
        className="object-cover object-center"
      />
      <div
        className="pointer-events-none absolute inset-0 z-1"
        style={{ backgroundImage: HERO_OVERLAY }}
      />
    </>
  );
}

function HeroSlideTitle({
  slide,
  animate,
  prefersReducedMotion,
}: {
  slide: HeroSlide;
  animate?: boolean;
  prefersReducedMotion?: boolean | null;
}) {
  if (!slide.title?.trim()) return null;
  const link = (
    <Link
      href={slide.href}
      className="pointer-events-auto block text-center text-xl font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-2xl md:text-3xl"
    >
      {slide.title}
    </Link>
  );
  if (!animate) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex justify-center shell-x pb-9 sm:pb-11 md:pb-12">
        {link}
      </div>
    );
  }
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex justify-center shell-x pb-9 sm:pb-11 md:pb-12"
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0.12 : T_TITLE,
        delay: prefersReducedMotion ? 0 : T_TITLE_DELAY,
        ease: easeHero,
      }}
    >
      {link}
    </motion.div>
  );
}

export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  /** Stay on a static first frame until the user/autoplay advances (LCP-safe). */
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [autoplayArmed, setAutoplayArmed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const next = useCallback(() => {
    setHasAdvanced(true);
    setDirection(1);
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setHasAdvanced(true);
    setDirection(-1);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const arm = window.setTimeout(() => setAutoplayArmed(true), AUTOPLAY_START_MS);
    return () => window.clearTimeout(arm);
  }, [slides.length]);

  const autoRun =
    !paused && autoplayArmed && slides.length > 1 && !prefersReducedMotion;

  useEffect(() => {
    if (!autoRun) return;

    const start = Date.now();
    queueMicrotask(() => setProgress(0));
    const progressId = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(1, elapsed / INTERVAL_MS));
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
      if (t?.closest?.('button,a,input,textarea,select,[role="combobox"]')) return;
      e.preventDefault();
      setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const slide = slides[index];
  if (!slide || slides.length === 0) return null;

  const showCarousel = hasAdvanced && slides.length > 1;

  return (
    <section
      id="shopify-section-template-hero"
      className="shopify-section index-section--hero index-section--slideshow w-full bg-[#111]"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      data-section-type="slideshow-section"
    >
      <div className="slideshow-wrapper relative w-full pb-5 sm:pb-6 md:pb-7">
        <div className="relative w-full overflow-hidden">
          {/* Hero strip — slight bump from 28/5 / 30/5 */}
          <div className="relative aspect-[26/5] w-full max-w-[100vw] sm:aspect-[28/5]">
            {!showCarousel ? (
              <div className="absolute inset-0 overflow-hidden">
                <HeroSlideImage slide={slides[0]} priority />
                <HeroSlideTitle slide={slides[0]} />
              </div>
            ) : (
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
                    x: {
                      duration: prefersReducedMotion ? T_REDUCED : T_SLIDE_MAIN,
                      ease: easeHero,
                    },
                  }}
                  className="absolute inset-0 overflow-hidden will-change-transform"
                >
                  <HeroSlideImage slide={slide} priority={index === 0} />
                  <HeroSlideTitle
                    slide={slide}
                    animate
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          <button
            type="button"
            className="sr-only"
            aria-live="polite"
            onClick={() => setPaused((p) => !p)}
          >
            {paused || prefersReducedMotion ? "Play slideshow" : "Pause slideshow"}
          </button>

          {slides.length > 1 ? (
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
          ) : null}
        </div>

        {slides.length > 1 ? (
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
        ) : null}
      </div>
    </section>
  );
}
