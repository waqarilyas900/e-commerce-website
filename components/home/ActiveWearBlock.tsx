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
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
}) {
  const optimized = optimizeSupplierImageUrl(src, 720);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs + collage sizing
    <img
      src={optimized}
      alt={alt}
      className={className}
      sizes={sizes}
      loading="lazy"
      decoding="async"
    />
  );
}

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
      className="shopify-section index-section border-b border-[#e8e8e1] bg-white py-10 md:py-16"
      data-section-type="collection-callout"
    >
      <ScrollReveal className="page-width mx-auto max-w-7xl shell-x">
        <div
          className={`feature-row flex flex-col items-center gap-10 lg:min-h-[520px] lg:flex-row lg:items-center lg:gap-8 xl:gap-0 ${
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
                      return (
                        <CalloutImg
                          key={`${img.src}-${n}`}
                          src={img.src}
                          alt={img.alt}
                          className={`callout-image callout-image--${n}`}
                          sizes={
                            n === 1
                              ? "(min-width: 590px) 380px, 195px"
                              : n === 2
                                ? "(min-width: 590px) 245px, 125px"
                                : n === 3
                                  ? "(min-width: 590px) 220px, 112px"
                                  : n === 4
                                    ? "(min-width: 590px) 270px, 140px"
                                    : "(min-width: 590px) 135px, 70px"
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden bg-neutral-100 md:max-w-[420px]">
                  <CalloutImg
                    src={slots[0]!.src}
                    alt={slots[0]!.alt}
                    className="h-full w-full object-cover object-center"
                    sizes="(max-width: 768px) 90vw, 420px"
                  />
                </div>
              )}
            </div>
          ) : null}

          <div className="feature-row__item feature-row__callout-text feature-row__text flex w-full min-w-0 flex-col justify-center px-0 py-2 lg:w-1/2 lg:max-w-[50%] lg:px-6 lg:py-10 xl:px-14 xl:py-16">
            <div className="feature-row__content larger-text mx-auto max-w-lg text-center lg:mx-0 lg:text-left">
              {featured.eyebrow.trim() ? (
                <p className="subtitle text-xs font-semibold capitalize tracking-[0.2em] text-neutral-500">
                  {featured.eyebrow}
                </p>
              ) : null}
              {featured.title.trim() ? (
                <div className="mt-3">
                  <HomeSectionTitle center={false} className="text-center lg:text-left">
                    {featured.title}
                  </HomeSectionTitle>
                </div>
              ) : null}
              {featured.description.trim() ? (
                <div className="rte mt-4 text-[15px] leading-relaxed text-[#1c1d1d] md:text-base">
                  <p>{featured.description}</p>
                </div>
              ) : null}
              {featured.primaryLabel.trim() || featured.secondaryLabel.trim() ? (
                <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                  {featured.primaryLabel.trim() ? (
                    <Link
                      href={featured.primaryHref}
                      className="btn btn--no-animate inline-flex items-center justify-center border border-[#111] bg-[#111] text-white transition hover:bg-[#040404]"
                    >
                      {featured.primaryLabel}
                    </Link>
                  ) : null}
                  {featured.secondaryLabel.trim() ? (
                    <Link
                      href={featured.secondaryHref}
                      className="btn btn--no-animate inline-flex items-center justify-center border border-[#111] bg-[#111] text-white transition hover:bg-[#040404]"
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
