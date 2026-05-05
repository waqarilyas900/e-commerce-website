import Image from "next/image";

const LOGO_SRC = "/outflint-logo.png";

const markSizeClass = {
  /**
   * Wide box + `object-contain`: logo is ~2:1 and has tight artboard margins — cover/crop
   * was clipping top (pins) and bottom (banner). Contain shows the full asset.
   */
  default:
    "h-9 w-[8.25rem] sm:h-10 sm:w-[9.25rem] md:h-11 md:w-[10rem]",
  /** Checkout / notification */
  large: "h-11 w-[9.75rem] sm:h-12 sm:w-[10.75rem]",
  /** Mobile drawer top bar */
  compact: "h-8 w-[7rem] sm:h-9 sm:w-[7.75rem]",
} as const;

export type OutflintLogoMarkSize = keyof typeof markSizeClass;

type LogoMarkProps = {
  size?: OutflintLogoMarkSize;
  className?: string;
  priority?: boolean;
};

/** Header / checkout “mini” logo: full PNG scaled to fit — no top/bottom crop. */
export function OutflintLogoMark({
  size = "default",
  className = "",
  priority,
}: LogoMarkProps) {
  return (
    <span
      className={`relative inline-block shrink-0 ${markSizeClass[size]} ${className}`.trim()}
    >
      <Image
        src={LOGO_SRC}
        alt=""
        fill
        sizes="(max-width: 768px) 160px, 180px"
        className="object-contain object-center"
        priority={priority}
        aria-hidden
      />
    </span>
  );
}

type FullProps = {
  className?: string;
};

/** Full logo (illustration + wordmark) for dark footer — matches black footer background. */
export function OutflintLogoFull({ className = "" }: FullProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt=""
      width={320}
      height={128}
      sizes="(max-width: 1024px) 220px, 280px"
      className={`h-12 w-auto max-w-[210px] object-contain object-left sm:h-14 sm:max-w-[248px] md:h-[3.75rem] md:max-w-[280px] ${className}`.trim()}
      aria-hidden
    />
  );
}
