import { unstable_noStore as noStore } from "next/cache";
import { StickyProductVideo } from "@/components/product/sticky-product-video";
import { dbListActiveProductsWithVideoUrl } from "@/app/lib/db/catalog";
import { parseProductVideoUrl } from "@/lib/product-video/url";

/**
 * Server-picked random sticky reel for the homepage (among products with video_url).
 */
export async function HomeStickyProductVideo() {
  noStore();
  const rows = await dbListActiveProductsWithVideoUrl();
  const playable = rows.filter((r) => parseProductVideoUrl(r.video_url));
  if (!playable.length) return null;
  const pick = playable[Math.floor(Math.random() * playable.length)]!;
  return (
    <StickyProductVideo
      videoUrl={pick.video_url}
      productName={pick.name}
      productHref={`/products/${pick.slug}`}
    />
  );
}
