import Image from "next/image";
import { WordmarkLogo } from "@/components/brand/wordmark-logo";
import {
  FALLBACK_FOOTER_LOGO_URL,
  FALLBACK_LOGO_URL,
  isRemoteAssetUrl,
  resolveFooterLogoUrl,
  resolveLogoUrl,
  resolveSiteName,
} from "@/lib/site-brand-env";

/**
 * Site logo components — header uses dark wordmark;
 * footer uses light wordmark on dark backgrounds.
 * Bundled brand SVGs render inline so Montserrat (page font) applies.
 */

const LOGO_WIDTH = 280;
const LOGO_HEIGHT = 90;

/**
 * Shared scale — header `default` and footer use the same visual size.
 * Aspect ≈ 1400:360 (~3.9:1).
 */
const LOGO_SIZE = {
  /** Primary header + footer wordmark */
  default:
    "h-16 w-[15.5rem] sm:h-[4.5rem] sm:w-[17.5rem] md:h-20 md:w-[19.5rem]",
  /** Checkout / promo */
  large:
    "h-[4.5rem] w-[17.5rem] sm:h-20 sm:w-[19.5rem] md:h-[5.25rem] md:w-[22rem]",
  /** Mobile drawer only */
  compact: "h-12 w-[11.75rem] sm:h-14 sm:w-[13.5rem]",
} as const;

const markSizeClass = LOGO_SIZE;

export type SiteLogoMarkSize = keyof typeof markSizeClass;

type LogoMarkProps = {
  size?: SiteLogoMarkSize;
  className?: string;
  priority?: boolean;
};

function isBundledDarkLogo(src: string): boolean {
  const path = src.split("?")[0] ?? src;
  return (
    path === FALLBACK_LOGO_URL ||
    path === "/brand/logo-dark.svg" ||
    path === "/brand/logo-dark.png" ||
    path === "/brand/logo-dark.webp" ||
    path === "/brand/logo.svg"
  );
}

function isBundledLightLogo(src: string): boolean {
  const path = src.split("?")[0] ?? src;
  return (
    path === FALLBACK_FOOTER_LOGO_URL ||
    path === "/brand/logo-light.svg" ||
    path === "/brand/logo-light.png" ||
    path === "/brand/logo-light.webp"
  );
}

function SiteLogoImage({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className: string;
  priority?: boolean;
}) {
  // SVGs + remote URLs use <img> — next/image blocks/optimizes SVG poorly.
  const useImg = isRemoteAssetUrl(src) || /\.svg($|\?)/i.test(src);
  if (useImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={className}
        decoding="async"
        loading="eager"
        fetchPriority={priority ? "high" : "low"}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={className}
      priority={priority}
      fetchPriority={priority ? "high" : "low"}
    />
  );
}

/** Header / checkout logo mark. */
export function SiteLogoMark({
  size = "default",
  className = "",
  priority,
}: LogoMarkProps) {
  const src = resolveLogoUrl();
  const alt = resolveSiteName();
  const sizeClass = markSizeClass[size];

  if (isBundledDarkLogo(src)) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center font-semibold ${sizeClass} ${className}`.trim()}
      >
        <WordmarkLogo
          variant="dark"
          title={alt}
          className="h-full w-full max-h-full max-w-full"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${sizeClass} ${className}`.trim()}
    >
      <SiteLogoImage
        src={src}
        alt={alt}
        priority={priority}
        className="h-full w-full max-h-full max-w-full object-contain object-center"
      />
    </span>
  );
}

type FullProps = {
  className?: string;
};

/** Footer / marketing — same size as header `default` for consistency. */
export function SiteLogoFull({ className = "" }: FullProps) {
  const src = resolveFooterLogoUrl();
  const alt = resolveSiteName();
  const sizeClass = LOGO_SIZE.default;

  if (isBundledLightLogo(src)) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-start font-semibold ${sizeClass} ${className}`.trim()}
      >
        <WordmarkLogo
          variant="light"
          title={alt}
          className="h-full w-full max-h-full max-w-full"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-start ${sizeClass} ${className}`.trim()}
    >
      <SiteLogoImage
        src={src}
        alt={alt}
        className="h-full w-full max-h-full max-w-full object-contain object-left"
      />
    </span>
  );
}
