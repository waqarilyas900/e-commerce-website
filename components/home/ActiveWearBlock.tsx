"use client";

import Link from "next/link";
import Image from "next/image";
import { useStoreBrand } from "@/app/providers/store-brand-provider";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

/** Homepage featured band — content from `home_page_settings.featured_block` (admin / SQL). */
export function ActiveWearBlock() {
  const { featured } = useStoreBrand();
  const hasImage = featured.imageUrl.trim().length > 0;
  const hasCopy =
    featured.title.trim().length > 0 ||
    featured.description.trim().length > 0 ||
    featured.eyebrow.trim().length > 0;

  if (!hasImage && !hasCopy) {
    return null;
  }

  return (
    <section
      id="shopify-section-template-collection-callout"
      className="shopify-section index-section border-b border-[#e8e8e1] bg-white py-6"
      data-section-type="collection-callout"
    >
      <ScrollReveal className="page-width mx-auto max-w-7xl shell-x">
        <div
          className={`feature-row grid min-h-[360px] md:min-h-[400px] md:items-stretch md:gap-0 ${
            hasImage ? "md:grid-cols-2" : "md:grid-cols-1"
          }`}
        >
          {hasImage ? (
            <div className="feature-row__item feature-row__callout-image relative min-h-[280px] md:min-h-[400px]">
              <div
                className="callout-images relative h-full min-h-[280px] w-full md:min-h-[400px]"
                data-aos="collection-callout"
              >
                <div className="relative h-full min-h-[280px] w-full overflow-hidden bg-neutral-100 md:min-h-[400px]">
                  <Image
                    src={featured.imageUrl}
                    alt=""
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="feature-row__item feature-row__callout-text feature-row__text flex flex-col justify-center px-0 py-10 md:px-10 md:py-12 lg:px-14 lg:py-16">
            <div className="feature-row__content larger-text max-w-lg">
              {featured.eyebrow.trim() ? (
                <p className="subtitle text-xs font-semibold capitalize tracking-[0.2em] text-neutral-500">
                  {featured.eyebrow}
                </p>
              ) : null}
              {featured.title.trim() ? (
                <h2 className="h3 mt-3 text-3xl font-semibold tracking-tight text-[#1c1d1d] md:text-[34px] md:leading-tight">
                  {featured.title}
                </h2>
              ) : null}
              {featured.description.trim() ? (
                <div className="rte mt-4 text-[15px] leading-relaxed text-[#1c1d1d] md:text-base">
                  <p>{featured.description}</p>
                </div>
              ) : null}
              {(featured.primaryLabel.trim() || featured.secondaryLabel.trim()) ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  {featured.primaryLabel.trim() ? (
                    <Link
                      href={featured.primaryHref}
                      className="btn btn--no-animate inline-flex min-h-[48px] items-center justify-center rounded border border-[#111] bg-[#111] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#040404]"
                    >
                      {featured.primaryLabel}
                    </Link>
                  ) : null}
                  {featured.secondaryLabel.trim() ? (
                    <Link
                      href={featured.secondaryHref}
                      className="btn btn--no-animate inline-flex min-h-[48px] items-center justify-center rounded border border-[#111] bg-[#111] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#040404]"
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
