"use client";

import Image from "next/image";
import { useStoreBrand } from "@/app/providers/store-brand-provider";

type Props = {
  size: number;
  className?: string;
};

/**
 * Header / drawer logo: uses store brand `faviconUrl` when set, otherwise `/dummy-logo.svg`.
 * Remote favicons use `<img>` so Next does not inject `<link rel="preload">` for LCP like it does for `next/image` + `priority`.
 */
export function StoreLogoMark({ size, className }: Props) {
  const { faviconUrl } = useStoreBrand();
  const src = faviconUrl.trim() || "/dummy-logo.svg";
  const remote = src.startsWith("http://") || src.startsWith("https://");

  if (remote) {
    return (
      <img
        src={src}
        alt=""
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
      alt=""
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
}
