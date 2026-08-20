import Image from "next/image";
import Link from "next/link";
import type { HeroSlide } from "@/app/lib/store-brand.types";
import { HeroSlideshow } from "@/components/home/HeroSlideshow";
import { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES } from "@/lib/images/hero";

const HERO_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)";

/**
 * Server-rendered LCP shell: first hero frame is in the initial HTML (discoverable
 * without waiting on the client carousel bundle). Multi-slide controls hydrate later.
 */
export function HeroBanner({ slides }: { slides: HeroSlide[] }) {
  if (!slides.length) return null;
  const first = slides[0];
  const multi = slides.length > 1;

  if (multi) {
    return <HeroSlideshow slides={slides} />;
  }

  return (
    <section
      id="shopify-section-template-hero"
      className="shopify-section index-section--hero index-section--slideshow w-full bg-[#111]"
      aria-label="Featured"
    >
      <div className="slideshow-wrapper relative w-full">
        <div className="relative w-full overflow-hidden">
          <div className="relative aspect-12/5 w-full max-w-[100vw]">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={first.image}
                alt={first.title?.trim() ? first.title : "Featured collection"}
                fill
                priority
                fetchPriority="high"
                quality={HERO_IMAGE_QUALITY}
                sizes={HERO_IMAGE_SIZES}
                className="object-cover object-center"
              />
              <div
                className="pointer-events-none absolute inset-0 z-1"
                style={{ backgroundImage: HERO_OVERLAY }}
              />
              {first.title?.trim() ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex justify-center shell-x pb-20 sm:pb-24 md:pb-28">
                  <Link
                    href={first.href}
                    className="pointer-events-auto block text-center text-3xl font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl"
                  >
                    {first.title}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
