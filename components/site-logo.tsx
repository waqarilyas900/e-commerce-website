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
 * Shared scale — height-driven + w-auto so tight SVG crop fills the box
 * without empty side padding. Header `default` === footer.
 */
const LOGO_SIZE = {
  default:
    "h-16 w-auto sm:h-[4.5rem] md:h-20",
  large:
    "h-[4.5rem] w-auto sm:h-20 md:h-[5.25rem]",
  compact: "h-12 w-auto sm:h-14",
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
          className="h-full w-auto max-h-full"
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
          className="h-full w-auto max-h-full"
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
