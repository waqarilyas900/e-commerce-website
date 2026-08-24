/** Shared hero image knobs — keep preload (`app/page.tsx`) in sync. */
export const HERO_IMAGE_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px";
/** Lower quality keeps Slow-4G LCP under budget; listed in next.config images.qualities. */
export const HERO_IMAGE_QUALITY = 60;
