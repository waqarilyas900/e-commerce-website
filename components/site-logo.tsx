import Image from "next/image";
import {
  isRemoteAssetUrl,
  resolveFooterLogoUrl,
  resolveLogoUrl,
  resolveSiteName,
} from "@/lib/site-brand-env";

/**
 * Site logo components — header uses `NEXT_PUBLIC_LOGO_URL` (dark mark);
 * footer uses `NEXT_PUBLIC_FOOTER_LOGO_URL` (light mark on dark backgrounds).
 */

const LOGO_WIDTH = 150;
const LOGO_HEIGHT = 50;

const markSizeClass = {
  default:
    "h-9 w-[8.25rem] sm:h-10 sm:w-[9.25rem] md:h-11 md:w-[10rem]",
  large: "h-11 w-[9.75rem] sm:h-12 sm:w-[10.75rem]",
  compact: "h-8 w-[7rem] sm:h-9 sm:w-[7.75rem]",
} as const;

export type SiteLogoMarkSize = keyof typeof markSizeClass;

type LogoMarkProps = {
  size?: SiteLogoMarkSize;
  className?: string;
  priority?: boolean;
};

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
  if (isRemoteAssetUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={className}
        decoding="async"
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

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${markSizeClass[size]} ${className}`.trim()}
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

  return (
    <SiteLogoImage
      src={src}
      alt={alt}
      className={`h-12 w-auto max-w-[210px] object-contain object-left sm:h-14 sm:max-w-[248px] md:h-[3.75rem] md:max-w-[280px] ${className}`.trim()}
    />
  );
}
