import { unstable_noStore as noStore } from "next/cache";
import { StickyProductVideo } from "@/components/product/sticky-product-video";
import { dbListActiveProductsWithVideoUrl } from "@/app/lib/db/catalog";
import { parseProductVideoSource } from "@/lib/product-video/url";
import { warmInstagramVideoResolve } from "@/lib/product-video/resolve-instagram";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";

/**
 * Homepage sticky reel + Rad-style vertical feed of every product with a video URL
 * (Instagram reel/post or direct MP4/HLS).
 */
export async function HomeStickyProductVideo() {
  noStore();
  const rows = await dbListActiveProductsWithVideoUrl();
  const playable = rows
    .map((r) => {
      if (!parseProductVideoSource(r.video_url)) return null;
      const poster = r.poster_url
        ? optimizeSupplierImageUrl(r.poster_url, 720) || r.poster_url
        : null;
      return {
        videoUrl: r.video_url,
        productName: r.name,
        productHref: `/products/${r.slug}`,
        posterUrl: poster,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  if (!playable.length) return null;
  const startIndex = Math.floor(Math.random() * playable.length);

  // Resolve Instagram CDN before HTML reaches the browser — first play is much faster.
  const startSrc = parseProductVideoSource(playable[startIndex]?.videoUrl ?? "");
  const codeMatch = startSrc?.src.match(/[?&]code=([^&]+)/);
  if (codeMatch?.[1]) {
    await warmInstagramVideoResolve(decodeURIComponent(codeMatch[1])).catch(() => {});
  }

  return <StickyProductVideo reels={playable} startIndex={startIndex} />;
}
