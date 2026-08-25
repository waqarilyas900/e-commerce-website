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

const LOGO_WIDTH = 220;
const LOGO_HEIGHT = 72;

/** ~35–40% larger than previous header marks. */
const markSizeClass = {
  default:
    "h-11 w-[9.5rem] sm:h-12 sm:w-[11.5rem] md:h-14 md:w-[13.5rem]",
  large: "h-12 w-[11rem] sm:h-14 sm:w-[13rem] md:h-16 md:w-[15rem]",
  compact: "h-9 w-[8rem] sm:h-11 sm:w-[10rem]",
} as const;

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

/** Footer / marketing — light logo on dark footer backgrounds. */
export function SiteLogoFull({ className = "" }: FullProps) {
  const src = resolveFooterLogoUrl();
  const alt = resolveSiteName();
  const footerClass =
    `h-14 w-auto max-w-[260px] object-contain object-left sm:h-16 sm:max-w-[300px] md:h-[4.25rem] md:max-w-[340px] ${className}`.trim();

  if (isBundledLightLogo(src)) {
    return (
      <span className={`inline-flex font-semibold ${footerClass}`}>
        <WordmarkLogo
          variant="light"
          title={alt}
          className="h-full w-auto max-h-full max-w-full"
        />
      </span>
    );
  }

  return <SiteLogoImage src={src} alt={alt} className={footerClass} />;
}
