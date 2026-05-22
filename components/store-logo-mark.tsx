"use client";

import Image from "next/image";
import { isRemoteAssetUrl, resolveLogoUrl, resolveSiteName } from "@/lib/site-brand-env";

type Props = {
  size: number;
  className?: string;
};

/**
 * Square mark for compact slots. Branding comes from `.env.local`:
 * `NEXT_PUBLIC_LOGO_URL` and `NEXT_PUBLIC_SITE_NAME`.
 */
export function StoreLogoMark({ size, className }: Props) {
  const src = resolveLogoUrl();
  const alt = resolveSiteName();

  if (isRemoteAssetUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={className}
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
}
