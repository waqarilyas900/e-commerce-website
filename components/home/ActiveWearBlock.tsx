"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { HomeSectionTitle } from "@/components/ui/home-section-title";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";
import type { CalloutProductImage } from "@/app/lib/home-callout-images";

type Props = {
  /** Up to 5 product images (different products) for the Rad-style collage. */
  calloutImages?: CalloutProductImage[];
};

function CalloutImg({
  src,
  alt,
  className,
  sizes,
  width,
  height,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  width: number;
  height: number;
}) {
  const optimized = optimizeSupplierImageUrl(src, 720);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs + collage sizing
    <img
      src={optimized}
      alt={alt}
      className={className}
      sizes={sizes}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
}

const CALLOUT_SLOT_SIZE: Record<number, { width: number; height: number }> = {
  1: { width: 380, height: 380 },
  2: { width: 245, height: 245 },
  3: { width: 220, height: 220 },
  4: { width: 270, height: 270 },
  5: { width: 135, height: 135 },
};

/** Homepage featured band — Rad-style multi-image callout + admin featured copy. */
export function ActiveWearBlock({ calloutImages = [] }: Props) {
  const { featured } = useStoreBrand();
  const [collageActive, setCollageActive] = useState(false);

  const images = calloutImages.slice(0, 5);
  const fallbackSrc = featured.imageUrl.trim()
    ? optimizeSupplierImageUrl(featured.imageUrl.trim(), 720)
    : "";

  const hasCollage = images.length >= 2;
  const hasSingle = !hasCollage && (images[0]?.src || fallbackSrc);
  const hasImage = hasCollage || Boolean(hasSingle);
  const hasCopy =
    featured.title.trim().length > 0 ||
    featured.description.trim().length > 0 ||
    featured.eyebrow.trim().length > 0;

  /**
   * Activate on the next frames after mount (not after a late IntersectionObserver).
   * Waiting until mid-viewport used to leave images at opacity:0 then slam them in —
   * that felt like a second page load when the section is near the top of home.
   */
  useEffect(() => {
    if (!hasCollage) return;
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) setCollageActive(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [hasCollage]);

  if (!hasImage && !hasCopy) {
    return null;
  }

  const slots = hasCollage
    ? images
    : images[0]
      ? [images[0]]
      : fallbackSrc
        ? [{ src: fallbackSrc, alt: featured.title || "Featured", href: featured.primaryHref || "/" }]
        : [];

  return (
    <section
      id="shopify-section-template-collection-callout"
      className="shopify-section index-section border-b border-[#e8e8e1] bg-white py-5 md:py-10"
      data-section-type="collection-callout"
    >
      <ScrollReveal className="page-width mx-auto max-w-7xl shell-x">
        <div
          className={`feature-row flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:gap-8 xl:gap-0 ${
            hasImage ? "" : ""
          }`}
        >
          {hasImage ? (
            <div className="feature-row__item feature-row__callout-image relative flex w-full min-w-0 shrink-0 justify-center lg:w-1/2 lg:max-w-[50%] lg:overflow-hidden">
              {hasCollage ? (
                <div
                  className={`callout-images${collageActive ? " is-callout-active" : ""}`}
                  data-aos="collection-callout"
                >
                  <div className="callout-image-centered">
                    {slots.map((img, i) => {
                      const n = i + 1;
                      const dims = CALLOUT_SLOT_SIZE[n] ?? CALLOUT_SLOT_SIZE[1]!;
                      return (
                        <CalloutImg
                          key={`${img.src}-${n}`}
                          src={img.src}
                          alt={img.alt}
                          className={`callout-image callout-image--${n}`}
                          width={dims.width}
                          height={dims.height}
                          sizes={
                            n === 1
                              ? "(min-width: 590px) 380px, 150px"
                              : n === 2
                                ? "(min-width: 590px) 245px, 95px"
                                : n === 3
                                  ? "(min-width: 590px) 220px, 88px"
                                  : n === 4
                                    ? "(min-width: 590px) 270px, 110px"
                                    : "(min-width: 590px) 135px, 56px"
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden bg-neutral-100 md:max-w-[420px]">
                  <CalloutImg
                    src={slots[0]!.src}
                    alt={slots[0]!.alt}
                    className="h-full w-full object-cover object-center"
                    width={420}
                    height={420}
                    sizes="(max-width: 768px) 70vw, 420px"
                  />
                </div>
              )}
            </div>
          ) : null}

          <div className="feature-row__item feature-row__callout-text feature-row__text flex w-full min-w-0 flex-col justify-center px-0 py-0 lg:w-1/2 lg:max-w-[50%] lg:px-6 lg:py-8 xl:px-14 xl:py-12">
            <div className="feature-row__content larger-text mx-auto max-w-lg text-center lg:mx-0 lg:text-left">
              {featured.eyebrow.trim() ? (
                <p className="subtitle text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-xs sm:capitalize sm:tracking-[0.2em]">
                  {featured.eyebrow}
                </p>
              ) : null}
              {featured.title.trim() ? (
                <div className="mt-1.5 sm:mt-3">
                  <HomeSectionTitle
                    center={false}
                    className="text-center !text-[1.2rem] !leading-tight sm:!text-[29.7px] sm:!leading-[35.64px] lg:text-left"
                  >
                    {featured.title}
                  </HomeSectionTitle>
                </div>
              ) : null}
              {featured.description.trim() ? (
                <div className="rte mt-2 line-clamp-3 text-[13px] leading-snug text-[#1c1d1d] sm:mt-4 sm:line-clamp-none sm:text-[15px] sm:leading-relaxed md:text-base">
                  <p>{featured.description}</p>
                </div>
              ) : null}
              {featured.primaryLabel.trim() || featured.secondaryLabel.trim() ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-6 sm:gap-3 lg:justify-start">
                  {featured.primaryLabel.trim() ? (
                    <Link
                      href={featured.primaryHref}
                      className="btn btn--no-animate inline-flex items-center justify-center border border-[#111] bg-[#111] px-3 py-2 text-[12px] text-white transition hover:bg-[#040404] sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      {featured.primaryLabel}
                    </Link>
                  ) : null}
                  {featured.secondaryLabel.trim() ? (
                    <Link
                      href={featured.secondaryHref}
                      className="btn btn--no-animate inline-flex items-center justify-center border border-[#111] bg-white px-3 py-2 text-[12px] text-[#111] transition hover:bg-neutral-50 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      {featured.secondaryLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
