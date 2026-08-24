"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

function HeroSlideTitle({ slide }: { slide: HeroSlide }) {
  if (!slide.title?.trim()) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex justify-center shell-x pb-20 sm:pb-24 md:pb-28">
      <Link
        href={slide.href}
        className="pointer-events-auto block text-center text-3xl font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl"
      >
        {slide.title}
      </Link>
    </div>
  );
}

/**
 * Hero carousel without framer-motion — CSS crossfade keeps LCP / TBT cheap on mobile.
 * First slide paints as a static SSR frame until the user or delayed autoplay advances.
 */
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasAdvanced, setHasAdvanced] = useState(false);
  const [autoplayArmed, setAutoplayArmed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const next = useCallback(() => {
    setHasAdvanced(true);
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setHasAdvanced(true);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
      <div className="slideshow-wrapper relative w-full">
        <div className="relative w-full overflow-hidden">
          {/* Fixed aspect box prevents CLS when slides swap. */}
          <div className="relative aspect-12/5 w-full max-w-[100vw]">
            {!showCarousel ? (
              <div className="absolute inset-0 overflow-hidden">
                <HeroSlideImage slide={slides[0]} priority />
                <HeroSlideTitle slide={slides[0]} />
              </div>
            ) : (
              slides.map((s, i) => {
                const active = i === index;
                return (
                  <div
                    key={slideStableKey(s, i)}
                    className="absolute inset-0 overflow-hidden transition-opacity duration-500 ease-out"
                    style={{
                      opacity: active ? 1 : 0,
                      pointerEvents: active ? "auto" : "none",
                      zIndex: active ? 2 : 0,
                    }}
                    aria-hidden={!active}
                  >
                    <HeroSlideImage slide={s} priority={i === 0} />
                    <HeroSlideTitle slide={s} />
                  </div>
                );
              })
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
