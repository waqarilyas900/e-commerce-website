import Link from "next/link";
import Image from "next/image";
import {
  getCachedListCollections,
  getCachedProductsByCollectionSlug,
} from "@/lib/cache/catalog-data";
import { hasCatalogDb } from "@/app/lib/db/env";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export type HomeCollectionTile = {
  slug: string;
  name: string;
  href: string;
  imageUrl: string;
  count: number;
};

/** Supplier CDNs (Daraz etc.) are not in next/image allowlist — use native img. */
function useNativeImg(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return false;
  }
  try {
    const host = new URL(src).hostname.toLowerCase();
    if (host.endsWith(".supabase.co")) return false;
    if (host === "images.unsplash.com") return false;
    return true;
  } catch {
    return false;
  }
}

async function loadHomeCollectionTiles(): Promise<HomeCollectionTile[]> {
  if (!hasCatalogDb()) return [];
  const collections = await getCachedListCollections();
  const tiles: HomeCollectionTile[] = [];

  for (const col of collections) {
    const slug = col.slug?.trim();
    const name = col.name?.trim();
    if (!slug || !name) continue;
    if (slug === "sale") continue;

    const products = await getCachedProductsByCollectionSlug(slug);
    if (products.length === 0) continue;

    const hero = (col.hero_image ?? "").trim();
    const fallback = products.find((p) => (p.image ?? "").trim())?.image?.trim() ?? "";
    tiles.push({
      slug,
      name,
      href: `/collections/${slug}`,
      imageUrl: hero || fallback,
      count: products.length,
    });
  }

  return tiles;
}

/** Compact collection grid under the featured band — short names, equal tiles. */
export async function HomeCollectionsStrip() {
  const tiles = await loadHomeCollectionTiles();
  if (tiles.length === 0) return null;

  return (
    <section
      aria-labelledby="home-collections-heading"
      className="border-b border-[#e8e8e1] bg-white"
    >
      <ScrollReveal className="mx-auto max-w-7xl shell-x py-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Browse
            </p>
            <h2
              id="home-collections-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-[#1c1d1d] sm:text-[28px]"
            >
              Shop collections
            </h2>
          </div>
          <Link
            href="/collections"
            className="shrink-0 text-sm font-semibold text-neutral-900 underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {tiles.map((tile) => {
            const native = useNativeImg(tile.imageUrl);
            return (
              <li key={tile.slug}>
                <Link
                  href={tile.href}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 transition hover:border-neutral-900 hover:bg-white"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                    {tile.imageUrl ? (
                      native ? (
                        // eslint-disable-next-line @next/next/no-img-element -- supplier CDNs (Daraz) outside next/image allowlist
                        <img
                          src={tile.imageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <Image
                          src={tile.imageUrl}
                          alt=""
                          fill
                          className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                        {tile.name}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-2 px-3 py-3 sm:px-4">
                    <span className="text-sm font-semibold tracking-tight text-[#1c1d1d] sm:text-[15px]">
                      {tile.name}
                    </span>
                    <span className="text-xs text-neutral-500">{tile.count}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollReveal>
    </section>
  );
}
