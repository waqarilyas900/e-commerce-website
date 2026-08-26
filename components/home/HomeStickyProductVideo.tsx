import { unstable_noStore as noStore } from "next/cache";
import { StickyProductVideo } from "@/components/product/sticky-product-video";
import { dbListActiveProductsWithVideoUrl } from "@/app/lib/db/catalog";
import { parseNativeProductVideoUrl } from "@/lib/product-video/url";
import { optimizeSupplierImageUrl } from "@/lib/images/supplier-cdn";

/**
 * Homepage sticky reel + Rad-style vertical feed of every product with a native video URL.
 */
export async function HomeStickyProductVideo() {
  noStore();
  const rows = await dbListActiveProductsWithVideoUrl();
  const playable = rows
    .map((r) => {
      if (!parseNativeProductVideoUrl(r.video_url)) return null;
      const poster = r.poster_url
        ? optimizeSupplierImageUrl(r.poster_url, 600) || r.poster_url
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
  return <StickyProductVideo reels={playable} startIndex={startIndex} />;
}
